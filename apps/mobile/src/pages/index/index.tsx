import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { resolveAssetUrl } from '../../config'
import { useRemoteImage } from '../../hooks/useRemoteImage'
import { momentApi } from '../../services/moment'
import { ApiError } from '../../services/request'
import type { MomentDto, PartnerBriefDto } from '@momoya/shared'
import { userApi } from '../../services/user'
import { useAuthStore } from '../../store/authStore'
import { useMomentStore } from '../../store/momentStore'

/** 两个时间戳里较早的那个到现在的天数（含当天），用于「在一起 N 天」 */
function daysSince(iso: string | undefined, otherIso: string | undefined): number {
  const candidates = [iso, otherIso].filter(Boolean) as string[]
  if (candidates.length === 0) return 0
  const earliest = Math.min(...candidates.map((s) => new Date(s).getTime()))
  const now = Date.now()
  const diff = Math.max(0, now - earliest)
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const mmdd = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (d.getFullYear() !== now.getFullYear()) return `${d.getFullYear()}-${mmdd} ${hhmm}`
  return `${mmdd} ${hhmm}`
}

export default function TimelineIndex() {
  const user = useAuthStore((s) => s.user)
  const items = useMomentStore((s) => s.items)
  const loading = useMomentStore((s) => s.loading)
  const refreshing = useMomentStore((s) => s.refreshing)
  const hasMore = useMomentStore((s) => s.hasMore)
  const refreshMoments = useMomentStore((s) => s.refresh)
  const fetchNext = useMomentStore((s) => s.fetchNext)
  const removeById = useMomentStore((s) => s.removeById)
  const resetMoments = useMomentStore((s) => s.reset)

  const [partner, setPartner] = useState<PartnerBriefDto | null>(null)
  const [meJoinedAt, setMeJoinedAt] = useState<string | undefined>(undefined)

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
        refreshMoments().catch(() => undefined),
      ])
      setPartner(p)
      // 自己 createdAt：从 partner 响应里拿不到，这里直接用"最早 moment 的 createdAt"降级；
      // 若有就用 auth store 里的；目前 MeDto 无 createdAt 字段，先用 undefined，以 partner.createdAt 为准。
      setMeJoinedAt(undefined)
    } catch (err) {
      if (err instanceof ApiError) {
        // session 类错误 request 层已跳转
      } else {
        Taro.showToast({ title: '加载失败', icon: 'none' })
      }
    }
  }, [ensureAuthed, refreshMoments])

  useLoad(() => {
    if (!ensureAuthed()) return
    void loadAll()
  })

  useDidShow(() => {
    if (!ensureAuthed()) return
    // 每次回到首页都重拉：既能感知被挤下线，也能看到对方刚发的内容。
    void loadAll()
  })

  useEffect(() => {
    // 登出时清掉列表，避免账号切换串数据
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (prev.accessToken && !state.accessToken) {
        resetMoments()
        setPartner(null)
      }
    })
    return unsub
  }, [resetMoments])

  const handleScrollToLower = () => {
    if (loading || !hasMore) return
    void fetchNext().catch(() => {
      Taro.showToast({ title: '加载更多失败', icon: 'none' })
    })
  }

  const handlePublish = () => {
    Taro.navigateTo({ url: '/pages/moments/publish/index' })
  }

  const handleLongPress = async (m: MomentDto) => {
    if (!user || m.author.id !== user.id) return
    const res = await Taro.showActionSheet({ itemList: ['删除这条动态'] })
    if (res.tapIndex !== 0) return
    const confirm = await Taro.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#ec4899',
    })
    if (!confirm.confirm) return
    Taro.showLoading({ title: '删除中…', mask: true })
    try {
      await momentApi.remove(m.id)
      removeById(m.id)
      Taro.hideLoading()
      Taro.showToast({ title: '已删除', icon: 'success' })
    } catch (err) {
      Taro.hideLoading()
      const msg = err instanceof ApiError ? err.msg : '删除失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }

  const days = daysSince(meJoinedAt, partner?.createdAt)

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
            items.map((m) => (
              <MomentCard
                key={m.id}
                m={m}
                isMine={!!user && m.author.id === user.id}
                onLongPress={() => void handleLongPress(m)}
              />
            ))
          )}

          {loading && (
            <View className="py-4 text-center">
              <Text className="text-xs text-pink-400">加载中…</Text>
            </View>
          )}
          {!loading && items.length > 0 && !hasMore && (
            <View className="py-4 text-center">
              <Text className="text-xs text-pink-300">到底啦 ♡</Text>
            </View>
          )}
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

// ---------- 子组件 ----------

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

interface MomentCardProps {
  m: MomentDto
  isMine: boolean
  onLongPress: () => void
}

function MomentCard({ m, isMine, onLongPress }: MomentCardProps) {
  const authorAvatarUrl = resolveAssetUrl(m.author.avatar)
  const authorSrc = useRemoteImage(authorAvatarUrl)

  const previewImages = m.images.map((u) => resolveAssetUrl(u))
  const handlePreview = (idx: number) => {
    if (previewImages.length === 0) return
    Taro.previewImage({
      current: previewImages[idx],
      urls: previewImages,
    }).catch(() => {})
  }

  const cols = m.images.length === 1 ? 1 : m.images.length <= 4 ? 2 : 3

  return (
    <View
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
      onLongPress={onLongPress}
    >
      <View className="flex items-center gap-3">
        <View className="h-10 w-10 overflow-hidden rounded-full bg-pink-100">
          {authorSrc ? (
            <Image src={authorSrc} className="h-full w-full" mode="aspectFill" />
          ) : (
            <View className="flex h-full w-full items-center justify-center text-lg text-pink-300">
              <Text>♡</Text>
            </View>
          )}
        </View>
        <View className="flex flex-1 flex-col">
          <View className="flex items-center gap-2">
            <Text className="text-sm font-medium text-gray-800">{m.author.nickname}</Text>
            {isMine && (
              <Text className="rounded bg-pink-100 px-1.5 py-0.5 text-[10px] text-pink-500">我</Text>
            )}
          </View>
          <Text className="text-[11px] text-gray-400">{formatTime(m.createdAt)}</Text>
        </View>
      </View>

      {m.text ? (
        <Text className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {m.text}
        </Text>
      ) : null}

      {m.images.length > 0 ? (
        <View
          className={`grid gap-1 ${
            cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {m.images.map((url, idx) => (
            <ThumbImage
              key={url + idx}
              relative={url}
              onTap={() => handlePreview(idx)}
              single={cols === 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function ThumbImage({
  relative,
  onTap,
  single,
}: {
  relative: string
  onTap: () => void
  single: boolean
}) {
  const absolute = resolveAssetUrl(relative)
  const src = useRemoteImage(absolute)
  return (
    <View
      className={`overflow-hidden rounded-lg bg-pink-50 ${single ? 'aspect-[4/3]' : 'aspect-square'}`}
      onClick={onTap}
    >
      {src ? (
        <Image src={src} className="h-full w-full" mode="aspectFill" />
      ) : (
        <View className="flex h-full w-full items-center justify-center text-xs text-pink-300">
          <Text>加载中</Text>
        </View>
      )}
    </View>
  )
}
