import { Button, Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { resolveAssetUrl } from '../../config'
import { useRemoteImage } from '../../hooks/useRemoteImage'
import { authApi } from '../../services/auth'
import { ApiError } from '../../services/request'
import { useAuthStore } from '../../store/authStore'

export default function Me() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logoutStore = useAuthStore((s) => s.logout)
  const [refreshing, setRefreshing] = useState(false)

  const ensureAuthed = () => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return false
    }
    return true
  }

  const loadMe = async () => {
    if (!ensureAuthed()) return
    setRefreshing(true)
    try {
      const me = await authApi.getMe()
      setUser(me)
    } catch (err) {
      if (!(err instanceof ApiError)) {
        Taro.showToast({ title: '加载用户信息失败', icon: 'none' })
      }
      // ApiError 已由 request 层做跳转 / toast 处理
    } finally {
      setRefreshing(false)
    }
  }

  // useDidShow 覆盖"首次进入"与"从其他页返回 / 小程序前后台切换回前台"三种时机，
  // 每次都 revalidate 一次 session：
  // - 被其他设备挤下线时，这里会拿到 401 + E_SESSION_KICKED，
  //   request 拦截器负责 reLaunch 到登录页。
  // - 也顺便让昵称/头像等与最新数据对齐。
  useDidShow(() => {
    if (!ensureAuthed()) return
    void loadMe()
  })

  useEffect(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  }, [])

  const handleEditProfile = () => {
    Taro.navigateTo({ url: '/pages/me/edit-profile/index' })
  }

  const handleChangePassword = () => {
    Taro.navigateTo({ url: '/pages/me/change-password/index' })
  }

  const handleLogout = async () => {
    const res = await Taro.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#ec4899',
    })
    if (!res.confirm) return
    Taro.showLoading({ title: '退出中…', mask: true })
    try {
      await authApi.logout()
    } catch {
      // 即使服务器登出失败也继续清本地
    }
    logoutStore()
    Taro.hideLoading()
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  const nickname = user?.nickname ?? '未登录'
  const username = user?.username ?? ''
  const bio = user?.bio || '还没有签名，快去写点什么～'
  const avatarUrl = useMemo(() => resolveAssetUrl(user?.avatar), [user?.avatar])
  const avatarSrc = useRemoteImage(avatarUrl)

  return (
    <View className="flex min-h-screen flex-col bg-pink-50 px-6 pt-10">
      <View className="flex flex-col items-center">
        <View
          className="h-24 w-24 overflow-hidden rounded-full border-4 border-pink-200 bg-white"
          onClick={handleEditProfile}
        >
          {avatarSrc ? (
            <Image src={avatarSrc} className="h-full w-full" mode="aspectFill" />
          ) : (
            <View className="flex h-full w-full items-center justify-center text-3xl text-pink-300">
              <Text>♡</Text>
            </View>
          )}
        </View>
        <Text className="mt-4 text-2xl font-semibold text-pink-600">{nickname}</Text>
        <Text className="mt-1 text-sm text-pink-400">@{username}</Text>
        <Text className="mt-3 text-sm text-gray-500">{bio}</Text>
      </View>

      <View className="mt-10 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <View
          className="flex items-center justify-between py-3"
          onClick={handleEditProfile}
        >
          <Text className="text-base text-gray-700">编辑资料</Text>
          <Text className="text-gray-300">›</Text>
        </View>
        <View className="h-px bg-gray-100" />
        <View
          className="flex items-center justify-between py-3"
          onClick={handleChangePassword}
        >
          <Text className="text-base text-gray-700">修改密码</Text>
          <Text className="text-gray-300">›</Text>
        </View>
        <View className="h-px bg-gray-100" />
        <View className="flex items-center justify-between py-3" onClick={loadMe}>
          <Text className="text-base text-gray-700">{refreshing ? '刷新中…' : '刷新资料'}</Text>
          <Text className="text-gray-300">↻</Text>
        </View>
      </View>

      <Button
        className="mt-10 rounded-full border border-pink-200 bg-white py-3 text-base text-pink-500"
        onClick={handleLogout}
      >
        退出登录
      </Button>

      <View className="mt-6 flex items-center justify-center pb-10">
        <Text className="text-xs text-pink-300">momoya · M3 profile ready</Text>
      </View>
    </View>
  )
}
