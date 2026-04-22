import { Button, Form, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { PASSWORD_MIN } from '@momoya/shared'
import { ApiError } from '../../services/request'
import { authApi } from '../../services/auth'
import { useAuthStore } from '../../store/authStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const loginToStore = useAuthStore((s) => s.login)

  useLoad(() => {
    if (useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/index/index' })
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
    Taro.showLoading({ title: '登录中…', mask: true })
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
      Taro.showToast({ title: `欢迎，${result.user.nickname}`, icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/index/index' })
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
    <View className="flex min-h-screen flex-col items-center justify-center bg-pink-50 px-8">
      <View className="mb-10 flex flex-col items-center gap-2">
        <Text className="text-5xl font-bold text-pink-600">momoya</Text>
        <Text className="text-sm text-pink-400">与你的她/他的日常</Text>
      </View>

      <Form className="w-full max-w-md">
        <View className="flex flex-col gap-4">
          <View className="flex flex-col gap-2">
            <Text className="text-sm text-gray-600">用户名</Text>
            <Input
              className="rounded-lg bg-white px-4 py-3 text-base text-gray-800 shadow-sm"
              type="text"
              placeholder="请输入用户名"
              value={username}
              onInput={(e) => setUsername(e.detail.value)}
              maxlength={32}
            />
          </View>

          <View className="flex flex-col gap-2">
            <Text className="text-sm text-gray-600">密码</Text>
            <Input
              className="rounded-lg bg-white px-4 py-3 text-base text-gray-800 shadow-sm"
              password
              placeholder="请输入密码"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
              maxlength={64}
            />
          </View>

          <Button
            className="mt-4 rounded-full bg-pink-500 py-3 text-base font-medium text-white"
            loading={submitting}
            disabled={submitting}
            onClick={handleSubmit}
          >
            登录
          </Button>
        </View>
      </Form>
    </View>
  )
}
