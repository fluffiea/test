import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import type { PartnerBriefDto, PostDto } from '@momoya/shared'
import PostCard from '../../components/PostCard'
import { resolveAssetUrl } from '../../config'
import { useRemoteImage } from '../../hooks/useRemoteImage'
import { postApi } from '../../services/post'
import { ApiError } from '../../services/request'
import { userApi } from '../../services/user'
import { useAuthStore } from '../../store/authStore'
import { useDailyStore } from '../../store/postFeedStore'

function daysSince(iso: string | undefined, otherIso: string | undefined): number {
  const candidates = [iso, otherIso].filter(Boolean) as string[]
  if (candidates.length === 0) return 0
  const earliest = Math.min(...candidates.map((s) => new Date(s).getTime()))
  const now = Date.now()
  const diff = Math.max(0, now - earliest)
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1
}

export default function DailyFeed() {
  const user = useAuthStore((s) => s.user)
  const items = useDailyStore((s) => s.items)
  const loading = useDailyStore((s) => s.loading)
  const refreshing = useDailyStore((s) => s.refreshing)
  const hasMore = useDailyStore((s) => s.hasMore)
  const refreshDaily = useDailyStore((s) => s.refresh)
  const fetchNext = useDailyStore((s) => s.fetchNext)
  const removeById = useDailyStore((s) => s.removeById)
  const resetDaily = useDailyStore((s) => s.reset)

  const [partner, setPartner] = useState<PartnerBriefDto | null>(null)

  const ensureAuthed = useCallback(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return false
    }
    return true
  }, [])

  const loadAll = useCallback(async () => {
    if (!ensureAuthed()) return
    try {
      const [p] = await Promise.all([
        userApi.getPartner().catch(() => null),
        refreshDaily().catch(() => undefined),
      ])
      setPartner(p)
    } catch (err) {
      if (err instanceof ApiError) {
        // session 类错误 request 层已跳转
      } else {
        Taro.showToast({ title: '加载失败', icon: 'none' })
      }
    }
  }, [ensureAuthed, refreshDaily])

  useLoad(() => {
    if (!ensureAuthed()) return
    void loadAll()
  })

  useDidShow(() => {
    if (!ensureAuthed()) return
    void loadAll()
  })

  useEffect(() => {
    // 登出时清掉列表，避免账号切换串数据
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (prev.accessToken && !state.accessToken) {
        resetDaily()
        setPartner(null)
      }
    })
    return unsub
  }, [resetDaily])

  const handleScrollToLower = () => {
    if (loading || !hasMore) return
    void fetchNext().catch(() => {
      Taro.showToast({ title: '加载更多失败', icon: 'none' })
    })
  }

  const handlePublish = () => {
    Taro.navigateTo({ url: '/pages/moments/publish/index' })
  }

  const handleOpenDetail = (p: PostDto) => {
    Taro.navigateTo({ url: `/pages/posts/detail/index?id=${p.id}` })
  }

  const handleLongPress = async (p: PostDto) => {
    if (!user || p.author.id !== user.id) return
    const res = await Taro.showActionSheet({ itemList: ['编辑', '删除'] })
    if (res.tapIndex === 0) {
      Taro.navigateTo({ url: `/pages/moments/publish/index?id=${p.id}` })
      return
    }
    if (res.tapIndex !== 1) return
    const confirm = await Taro.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#ec4899',
    })
    if (!confirm.confirm) return
    Taro.showLoading({ title: '删除中…', mask: true })
    try {
      await postApi.remove(p.id)
      removeById(p.id)
      Taro.hideLoading()
      Taro.showToast({ title: '已删除', icon: 'success' })
    } catch (err) {
      Taro.hideLoading()
      const msg = err instanceof ApiError ? err.msg : '删除失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }

  const days = daysSince(undefined, partner?.createdAt)

  return (
    <View className="flex min-h-screen flex-col bg-pink-50">
      <RelationCard me={user} partner={partner} days={days} />

      <ScrollView
        className="flex-1"
        scrollY
        enableBackToTop
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={() => void loadAll()}
        onScrollToLower={handleScrollToLower}
        lowerThreshold={80}
      >
        <View className="flex flex-col gap-3 px-4 pb-24 pt-3">
          {items.length === 0 && !refreshing ? (
            <View className="mt-20 flex flex-col items-center gap-2">
              <Text className="text-4xl">♡</Text>
              <Text className="text-sm text-pink-400">还没有日常，点右下角开始写第一条</Text>
            </View>
          ) : (
            items.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                isMine={!!user && p.author.id === user.id}
                onLongPress={() => void handleLongPress(p)}
                onTap={() => handleOpenDetail(p)}
              />
            ))
          )}

          {loading ? (
            <View className="py-4 text-center">
              <Text className="text-xs text-pink-400">加载中…</Text>
            </View>
          ) : null}
          {!loading && items.length > 0 && !hasMore ? (
            <View className="py-4 text-center">
              <Text className="text-xs text-pink-300">到底啦 ♡</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg"
        onClick={handlePublish}
      >
        <Text className="text-3xl leading-none text-white">+</Text>
      </View>
    </View>
  )
}

interface RelationCardProps {
  me: ReturnType<typeof useAuthStore.getState>['user']
  partner: PartnerBriefDto | null
  days: number
}

function RelationCard({ me, partner, days }: RelationCardProps) {
  const meAvatarUrl = resolveAssetUrl(me?.avatar)
  const partnerAvatarUrl = resolveAssetUrl(partner?.avatar)
  const meSrc = useRemoteImage(meAvatarUrl)
  const partnerSrc = useRemoteImage(partnerAvatarUrl)

  return (
    <View className="mx-4 mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-200 to-pink-100 p-4 shadow-sm">
      <Avatar src={meSrc} label={me?.nickname ?? '你'} />
      <View className="flex flex-col items-center">
        <Text className="text-xs text-pink-500">在一起</Text>
        <Text className="text-2xl font-semibold text-pink-600">
          {partner ? `${days}` : '—'}
        </Text>
        <Text className="text-xs text-pink-500">天</Text>
      </View>
      <Avatar src={partnerSrc} label={partner?.nickname ?? '等待 TA'} />
    </View>
  )
}

function Avatar({ src, label }: { src: string; label: string }) {
  return (
    <View className="flex flex-col items-center gap-1">
      <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-white">
        {src ? (
          <Image src={src} className="h-full w-full" mode="aspectFill" />
        ) : (
          <View className="flex h-full w-full items-center justify-center text-2xl text-pink-300">
            <Text>♡</Text>
          </View>
        )}
      </View>
      <Text className="max-w-[72px] truncate text-xs text-pink-700">{label}</Text>
    </View>
  )
}
