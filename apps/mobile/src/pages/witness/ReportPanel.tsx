import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useEffect } from 'react'
import type { PostDto, ReportFilter } from '@momoya/shared'
import PostCard from '../../components/PostCard'
import { postApi } from '../../services/post'
import { ApiError } from '../../services/request'
import { useAuthStore } from '../../store/authStore'
import { useReportStore } from '../../store/postFeedStore'

const px = (n: number) => Taro.pxTransform(n)

const FILTERS: Array<{ key: ReportFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未阅' },
  { key: 'mine', label: '我发的' },
]

interface Props {
  active: boolean
}

export default function ReportPanel({ active }: Props) {
  const user = useAuthStore((s) => s.user)
  const filter = useReportStore((s) => s.filter)
  const items = useReportStore((s) => s.items)
  const loading = useReportStore((s) => s.loading)
  const refreshing = useReportStore((s) => s.refreshing)
  const hasMore = useReportStore((s) => s.hasMore)
  const refreshReports = useReportStore((s) => s.refresh)
  const fetchNext = useReportStore((s) => s.fetchNext)
  const removeById = useReportStore((s) => s.removeById)
  const resetReports = useReportStore((s) => s.reset)
  const setFilter = useReportStore((s) => s.setFilter)

  const reload = useCallback(async () => {
    if (!useAuthStore.getState().isAuthed()) return
    try {
      await refreshReports()
    } catch (err) {
      if (!(err instanceof ApiError)) {
        Taro.showToast({ title: '加载失败', icon: 'none' })
      }
    }
  }, [refreshReports])

  useEffect(() => {
    if (!active) return
    void reload()
  }, [active, reload])

  useDidShow(() => {
    if (!active) return
    void reload()
  })

  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (prev.accessToken && !state.accessToken) resetReports()
    })
    return unsub
  }, [resetReports])

  const handleScrollToLower = () => {
    if (loading || !hasMore) return
    void fetchNext().catch(() => {
      Taro.showToast({ title: '加载更多失败', icon: 'none' })
    })
  }

  const handleTapFilter = (key: ReportFilter) => {
    if (key === filter) return
    void setFilter(key).catch(() => {
      Taro.showToast({ title: '切换失败', icon: 'none' })
    })
  }

  const handlePublish = () => {
    Taro.navigateTo({ url: '/pages/reports/publish/index' })
  }

  const handleOpenDetail = (p: PostDto) => {
    Taro.navigateTo({ url: `/pages/posts/detail/index?id=${p.id}` })
  }

  const handleLongPress = async (p: PostDto) => {
    if (!user || p.author.id !== user.id) return
    const res = await Taro.showActionSheet({ itemList: ['编辑', '删除'] })
    if (res.tapIndex === 0) {
      Taro.navigateTo({ url: `/pages/reports/publish/index?id=${p.id}` })
      return
    }
    if (res.tapIndex !== 1) return
    const confirm = await Taro.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#668F80',
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

  return (
    <View className="flex flex-1 flex-col">
      {/* 筛选器 */}
      <View className="flex items-center gap-2 px-4 py-2.5">
        {FILTERS.map((f) => {
          const isActive = f.key === filter
          return (
            <View
              key={f.key}
              className="rounded-full px-3 py-1"
              style={{
                backgroundColor: isActive ? '#668F80' : 'rgba(195,181,159,0.25)',
                border: isActive ? 'none' : '1px solid rgba(195,181,159,0.5)',
              }}
              onClick={() => handleTapFilter(f.key)}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: isActive ? '#fff' : '#4A6670' }}
              >
                {f.label}
              </Text>
            </View>
          )
        })}
      </View>

      <ScrollView
        className="flex-1"
        scrollY
        enableBackToTop
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={() => void reload()}
        onScrollToLower={handleScrollToLower}
        lowerThreshold={80}
      >
        <View className="flex flex-col gap-3 px-4 pb-24 pt-1">
          {items.length === 0 && !refreshing ? (
            <View className="mt-20 flex flex-col items-center gap-3">
              <Text style={{ fontSize: px(80), color: '#C3B59F' }}>✦</Text>
              <Text className="text-sm" style={{ color: '#C3B59F' }}>
                {filter === 'unread'
                  ? '没有未阅的报备'
                  : filter === 'mine'
                  ? '还没有发过报备'
                  : '还没有报备'}
              </Text>
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
              <Text className="text-xs" style={{ color: '#C3B59F' }}>加载中…</Text>
            </View>
          ) : null}
          {!loading && items.length > 0 && !hasMore ? (
            <View className="py-4 text-center">
              <Text className="text-xs" style={{ color: '#C3B59F' }}>到底啦 ♡</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {active ? (
        <View
          className="fixed bottom-24 right-6 flex items-center justify-center rounded-full"
          style={{
            width: px(112),
            height: px(112),
            backgroundColor: '#A0AF84',
            boxShadow: `0 ${px(8)} ${px(28)} rgba(160,175,132,0.38)`,
          }}
          onClick={handlePublish}
        >
          <Text
            style={{
              fontSize: px(56),
              lineHeight: px(56),
              color: '#fff',
              fontWeight: '300',
            }}
          >
            +
          </Text>
        </View>
      ) : null}
    </View>
  )
}
