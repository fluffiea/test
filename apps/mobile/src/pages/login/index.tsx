import { Button, Form, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { memo, useCallback, useMemo, useState } from 'react'
import { PASSWORD_MIN } from '@momoya/shared'
import { ApiError } from '../../services/request'
import { authApi } from '../../services/auth'
import { useAuthStore } from '../../store/authStore'

const ACCOUNTS = ['jiangjiang', 'mengmeng']

/**
 * 内联 style 里的尺寸走 Taro.pxTransform，参数是 750 设计稿标注值
 * 详见 .cursor/rules/styling-conventions.mdc 三
 */
const px = (n: number) => Taro.pxTransform(n)

const INPUT_INNER_STYLE = {
  paddingLeft: px(32),
  paddingRight: px(32),
  height: px(96),
  fontSize: px(32),
  lineHeight: px(96),
  color: '#4A6670',
} as const

/**
 * placeholderStyle 是原生字符串，不走 PostCSS，也不走 Taro 运行时
 * 详见 .cursor/rules/styling-conventions.mdc 四：直接写 px（物理像素）
 */
const PLACEHOLDER_STYLE = 'color:#D6A2AD;font-size:16px;line-height:48px;'

const FLOATERS = [
  { char: '✿', cls: 'float-anim', pos: { top: '6%', left: '7%' }, delay: '0s', size: 56, color: '#A0AF84' },
  { char: '⊹', cls: 'float-anim-slow', pos: { top: '11%', right: '9%' }, delay: '0.8s', size: 36, color: '#668F80' },
  { char: '❋', cls: 'float-anim', pos: { top: '18%', left: '14%' }, delay: '1.2s', size: 40, color: '#D6A2AD' },
  { char: '◌', cls: 'float-anim-slow', pos: { top: '5%', right: '22%' }, delay: '0.4s', size: 72, color: '#C3B59F' },
  { char: '✦', cls: 'float-anim', pos: { bottom: '20%', left: '4%' }, delay: '2s', size: 60, color: '#A0AF84' },
  { char: '❋', cls: 'float-anim', pos: { bottom: '14%', right: '7%' }, delay: '1.6s', size: 44, color: '#668F80' },
  { char: '✿', cls: 'float-anim-slow', pos: { bottom: '28%', right: '14%' }, delay: '0.2s', size: 32, color: '#D6A2AD' },
]

/** 下拉显隐只在子组件内 setState；memo 避免输入密码时父级重渲染带动用户名 Input 重绘 */
const UsernameField = memo(function UsernameField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const filteredAccounts = useMemo(
    () =>
      ACCOUNTS.filter((a) =>
        value.trim() === '' ? true : a.includes(value.trim().toLowerCase()),
      ),
    [value],
  )

  return (
    <View className="relative">
      <View
        className="flex h-12 flex-row items-center overflow-hidden rounded-2xl"
        style={{ background: 'rgba(195,181,159,0.15)', border: '1px solid #668F80' }}
      >
        <Input
          className="flex-1"
          style={INPUT_INNER_STYLE}
          type="text"
          placeholder="点我选一个～"
          placeholderClass="login-input-placeholder"
          placeholderStyle={PLACEHOLDER_STYLE}
          value={value}
          onInput={(e) => {
            onChange(e.detail.value)
            setMenuOpen(true)
          }}
          onFocus={() => setMenuOpen(true)}
          onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
          maxlength={32}
        />
      </View>
      {filteredAccounts.length > 0 ? (
        <View
          className="absolute left-0 right-0 z-20 overflow-hidden rounded-2xl bg-white"
          style={{
            top: '100%',
            marginTop: px(12),
            border: '1px solid #C3B59F',
            boxShadow: `0 ${px(8)} ${px(32)} rgba(74,102,112,0.10)`,
            opacity: menuOpen ? 1 : 0,
            visibility: menuOpen ? 'visible' : 'hidden',
            pointerEvents: menuOpen ? 'auto' : 'none',
          }}
        >
          {filteredAccounts.map((account, idx) => (
            <View
              key={account}
              className="flex flex-row items-center gap-3 px-4"
              style={{
                height: px(96),
                borderBottom: idx < filteredAccounts.length - 1 ? '1px solid #C3B59F' : 'none',
              }}
              onClick={() => {
                onChange(account)
                setMenuOpen(false)
              }}
            >
              <Text className="text-base">{account === 'mengmeng' ? '🌸' : '🌿'}</Text>
              <Text className="text-sm font-medium" style={{ color: '#4A6670' }}>{account}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
})

const PasswordField = memo(function PasswordField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <View
      className="flex h-12 flex-row items-center overflow-hidden rounded-2xl"
      style={{ background: 'rgba(195,181,159,0.15)', border: '1px solid #668F80' }}
    >
      <Input
        className="flex-1"
        style={INPUT_INNER_STYLE}
        password
        placeholder="只有你知道的秘密～"
        placeholderClass="login-input-placeholder"
        placeholderStyle={PLACEHOLDER_STYLE}
        value={value}
        onInput={(e) => onChange(e.detail.value)}
        maxlength={64}
      />
    </View>
  )
})

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const loginToStore = useAuthStore((s) => s.login)

  const setUsernameStable = useCallback((v: string) => setUsername(v), [])
  const setPasswordStable = useCallback((v: string) => setPassword(v), [])

  useLoad(() => {
    if (useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/home/index' })
    }
  })

  const handleSubmit = async () => {
    const u = username.trim()
    const p = password
    if (u.length < 3) {
      Taro.showToast({ title: '用户名至少 3 位', icon: 'none' })
      return
    }
    if (p.length < PASSWORD_MIN) {
      Taro.showToast({ title: `密码至少 ${PASSWORD_MIN} 位`, icon: 'none' })
      return
    }

    setSubmitting(true)
    Taro.showLoading({ title: '进入中…', mask: true })
    try {
      const result = await authApi.login({ username: u, password: p })
      loginToStore({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessExpiresIn: result.accessExpiresIn,
        refreshExpiresIn: result.refreshExpiresIn,
        user: result.user,
      })
      Taro.hideLoading()
      Taro.showToast({ title: `欢迎回来，${result.user.nickname} ♡`, icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/home/index' })
      }, 600)
    } catch (err) {
      Taro.hideLoading()
      const msg =
        err instanceof ApiError ? err.msg : err instanceof Error ? err.message : '登录失败'
      Taro.showToast({ title: msg, icon: 'none', duration: 2500 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View
      className="relative flex min-h-screen flex-col items-center justify-center px-6"
      style={{
        // 仅使用色板内的 warm-sand，用透明度叠出层次（详见 .cursor/rules/color-palette.mdc）
        background:
          'linear-gradient(160deg, #C3B59F 0%, rgba(195,181,159,0.85) 50%, rgba(195,181,159,0.65) 100%)',
      }}
    >
      {FLOATERS.map((f, i) => (
        <Text
          key={i}
          className={`pointer-events-none absolute ${f.cls}`}
          style={{ ...f.pos, fontSize: px(f.size), color: f.color, animationDelay: f.delay }}
        >
          {f.char}
        </Text>
      ))}

      <View
        className="relative z-10 -mt-12 w-full rounded-3xl bg-white px-7 py-9"
        style={{
          border: '1px solid #C3B59F',
          boxShadow: `0 ${px(16)} ${px(64)} rgba(74,102,112,0.12)`,
        }}
      >
        <View className="mb-7 flex flex-col items-center gap-1">
          <View className="mb-1 flex flex-row items-center gap-2">
            <Text style={{ fontSize: px(40), color: '#A0AF84' }}>✿</Text>
            <Text className="text-2xl font-bold" style={{ color: '#4A6670' }}>欢迎回来</Text>
            <Text style={{ fontSize: px(40), color: '#A0AF84' }}>✿</Text>
          </View>
          <Text className="text-sm" style={{ color: '#668F80' }}>萌萌 & 江江的小站</Text>
        </View>

        <Form>
          <View className="flex flex-col gap-5">
            <View className="flex flex-col gap-2">
              <Text className="text-xs font-medium" style={{ color: '#4A6670' }}>你是谁呀 ✿</Text>
              <UsernameField value={username} onChange={setUsernameStable} />
            </View>

            <View className="flex flex-col gap-2">
              <Text className="text-xs font-medium" style={{ color: '#4A6670' }}>悄悄暗语 ❋</Text>
              <PasswordField value={password} onChange={setPasswordStable} />
            </View>

            <Button
              className="mt-2 w-full rounded-full font-semibold text-white"
              style={{
                height: px(96),
                lineHeight: px(96),
                fontSize: px(30),
                background: submitting ? '#A0AF84' : '#668F80',
                letterSpacing: '0.04em',
              }}
              loading={submitting}
              disabled={submitting}
              onClick={handleSubmit}
            >
              进入小站 ✦
            </Button>
          </View>
        </Form>

        <View className="mt-5 flex flex-row items-center justify-center gap-1">
          <Text style={{ fontSize: px(24), color: '#C3B59F' }}>✦</Text>
          <Text className="text-xs" style={{ color: '#A0AF84' }}>只属于我们两个人的地方</Text>
          <Text style={{ fontSize: px(24), color: '#C3B59F' }}>✦</Text>
        </View>
      </View>
    </View>
  )
}
