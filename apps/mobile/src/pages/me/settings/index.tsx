import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import {
  WITNESS_DEFAULT_TAB_OPTIONS,
  type WitnessDefaultTab,
} from '@momoya/shared'
import { ApiError } from '../../../services/request'
import { userApi } from '../../../services/user'
import { useAuthStore } from '../../../store/authStore'

const px = (n: number) => Taro.pxTransform(n)

export default function SettingsPage() {
  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const current: WitnessDefaultTab = user?.settings.defaultWitnessTab ?? 'daily'
  const [saving, setSaving] = useState<WitnessDefaultTab | null>(null)

  const handlePick = async (next: WitnessDefaultTab) => {
    if (next === current || saving) return
    setSaving(next)
    try {
      const updated = await userApi.updateMe({
        settings: { defaultWitnessTab: next },
      })
      setUser(updated)
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch (err) {
      const msg = err instanceof ApiError ? err.msg : '保存失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <View
      className="min-h-screen px-5 pt-6"
      style={{ backgroundColor: 'rgba(195,181,159,0.18)' }}
    >
      {/* 区块标题 */}
      <View className="mb-3 flex items-center gap-2 px-1">
        <Text style={{ fontSize: px(24), color: '#A0AF84' }}>⊹</Text>
        <Text className="text-xs font-medium" style={{ color: '#668F80' }}>见证页偏好</Text>
      </View>

      <View
        className="rounded-2xl bg-white p-5"
        style={{
          border: '1px solid rgba(195,181,159,0.5)',
          boxShadow: `0 ${px(4)} ${px(20)} rgba(74,102,112,0.07)`,
        }}
      >
        <Text className="text-sm font-medium" style={{ color: '#4A6670' }}>进入见证时默认显示</Text>

        <View className="mt-3 flex items-center gap-2 rounded-full p-1" style={{ backgroundColor: 'rgba(195,181,159,0.2)' }}>
          {WITNESS_DEFAULT_TAB_OPTIONS.map((opt) => {
            const active = opt.value === current
            const isSaving = saving === opt.value
            return (
              <View
                key={opt.value}
                className="flex-1 rounded-full py-2 text-center"
                style={{ backgroundColor: active ? '#668F80' : 'transparent' }}
                onClick={() => void handlePick(opt.value)}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: active ? '#fff' : '#4A6670' }}
                >
                  {isSaving ? '保存中…' : opt.label}
                </Text>
              </View>
            )
          })}
        </View>

        <Text
          className="mt-3 leading-relaxed"
          style={{ fontSize: px(22), color: '#C3B59F' }}
        >
          点击底部「见证」进入时会默认展示该模块；在见证页内手动切换仅本次有效。
        </Text>
      </View>
    </View>
  )
}
