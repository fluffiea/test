import { Button, Form, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { ErrorKey, PASSWORD_MIN } from '@momoya/shared'
import { authApi } from '../../../services/auth'
import { ApiError } from '../../../services/request'
import { useAuthStore } from '../../../store/authStore'

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setTokens = useAuthStore((s) => s.setTokens)

  const validate = (): string | null => {
    if (oldPassword.length < PASSWORD_MIN) return `旧密码至少 ${PASSWORD_MIN} 位`
    if (newPassword.length < PASSWORD_MIN) return `新密码至少 ${PASSWORD_MIN} 位`
    if (newPassword === oldPassword) return '新密码不能与旧密码相同'
    if (newPassword !== confirmPassword) return '两次输入的新密码不一致'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      Taro.showToast({ title: err, icon: 'none' })
      return
    }
    setSubmitting(true)
    Taro.showLoading({ title: '提交中…', mask: true })
    try {
      const result = await authApi.changePassword({ oldPassword, newPassword })
      setTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessExpiresIn: result.accessExpiresIn,
        refreshExpiresIn: result.refreshExpiresIn,
      })
      Taro.hideLoading()
      Taro.showToast({ title: '修改成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (e) {
      Taro.hideLoading()
      if (e instanceof ApiError && e.errorKey === ErrorKey.E_AUTH_WRONG_OLD_PASSWORD) {
        Taro.showToast({ title: '旧密码不正确', icon: 'none' })
      } else {
        const msg = e instanceof ApiError ? e.msg : e instanceof Error ? e.message : '修改失败'
        Taro.showToast({ title: msg, icon: 'none' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex min-h-screen flex-col bg-pink-50 px-6 pt-8">
      <Form className="w-full">
        <View className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex flex-col gap-2">
            <Text className="text-sm text-gray-600">当前密码</Text>
            <Input
              className="rounded-lg bg-pink-50 px-4 py-3 text-base text-gray-800"
              password
              placeholder="请输入当前密码"
              value={oldPassword}
              onInput={(e) => setOldPassword(e.detail.value)}
              maxlength={64}
            />
          </View>
          <View className="flex flex-col gap-2">
            <Text className="text-sm text-gray-600">新密码</Text>
            <Input
              className="rounded-lg bg-pink-50 px-4 py-3 text-base text-gray-800"
              password
              placeholder="6-64 位"
              value={newPassword}
              onInput={(e) => setNewPassword(e.detail.value)}
              maxlength={64}
            />
          </View>
          <View className="flex flex-col gap-2">
            <Text className="text-sm text-gray-600">确认新密码</Text>
            <Input
              className="rounded-lg bg-pink-50 px-4 py-3 text-base text-gray-800"
              password
              placeholder="再次输入新密码"
              value={confirmPassword}
              onInput={(e) => setConfirmPassword(e.detail.value)}
              maxlength={64}
            />
          </View>
        </View>

        <Button
          className="mt-6 rounded-full bg-pink-500 py-3 text-base font-medium text-white"
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
        >
          确认修改
        </Button>

        <Text className="mt-4 block text-center text-xs text-gray-400">
          修改成功后其他已登录设备将自动下线
        </Text>
      </Form>
    </View>
  )
}
