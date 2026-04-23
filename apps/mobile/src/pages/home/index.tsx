import { Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import type { AnniversaryDto } from '@momoya/shared'
import { anniversaryApi } from '../../services/anniversary'
import { ApiError } from '../../services/request'
import { useAuthStore } from '../../store/authStore'
import BottomTabBar from '../../components/BottomTabBar'
import { useHiddenNativeTabBar } from '../../hooks/useHiddenNativeTabBar'
import {
  computeAnniversaryStats,
  formatMonthDay,
} from '../../utils/anniversary'

const px = (n: number) => Taro.pxTransform(n)

function isoToPickerValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pickerValueToIso(val: string): string {
  return `${val}T00:00:00.000Z`
}

const HEADER_FLOATERS = [
  { char: '✿', cls: 'float-anim', pos: { top: '14%', right: '8%' }, delay: '0.3s', size: 44, color: '#A0AF84' },
  { char: '◌', cls: 'float-anim-slow', pos: { top: '6%', right: '28%' }, delay: '0.9s', size: 60, color: 'rgba(195,181,159,0.6)' },
  { char: '⊹', cls: 'float-anim', pos: { top: '20%', left: '6%' }, delay: '1.5s', size: 32, color: '#668F80' },
]

export default function HomePage() {
  useHiddenNativeTabBar()

  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<AnniversaryDto[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const ensureAuthed = useCallback(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
      return false
    }
    return true
  }, [])

  const load = useCallback(async () => {
    if (!ensureAuthed()) return
    setLoading(true)
    try {
      const res = await anniversaryApi.list()
      setItems(res.items)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorKey !== 'E_ANNIV_FORBIDDEN') {
          Taro.showToast({ title: err.msg || '加载失败', icon: 'none' })
        }
      } else {
        Taro.showToast({ title: '加载失败', icon: 'none' })
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [ensureAuthed])

  useLoad(() => {
    void load()
  })
  useDidShow(() => {
    void load()
  })

  useEffect(() => {
    if (refreshTick === 0) return
    void load()
  }, [refreshTick, load])

  useEffect(() => {
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (prev.accessToken && !state.accessToken) setItems([])
    })
    return unsub
  }, [])

  const handleChangeDate = useCallback(
    async (item: AnniversaryDto, val: string) => {
      Taro.showLoading({ title: '保存中…', mask: true })
      try {
        await anniversaryApi.update(item.id, { date: pickerValueToIso(val) })
        Taro.hideLoading()
        Taro.showToast({ title: '已更新', icon: 'success' })
        setRefreshTick((n) => n + 1)
      } catch (err) {
        Taro.hideLoading()
        const msg = err instanceof ApiError ? err.msg : '保存失败'
        Taro.showToast({ title: msg, icon: 'none' })
      }
    },
    [],
  )

  return (
    <View className="min-h-screen" style={{ backgroundColor: 'rgba(195,181,159,0.18)' }}>
      {/* 页面顶部 header */}
      <View
        className="relative overflow-hidden px-5 pb-5 pt-8"
        style={{ background: 'linear-gradient(160deg, #C3B59F 0%, rgba(195,181,159,0.72) 100%)' }}
      >
        {HEADER_FLOATERS.map((f, i) => (
          <Text
            key={i}
            className={`pointer-events-none absolute ${f.cls}`}
            style={{ ...f.pos, fontSize: px(f.size), color: f.color, animationDelay: f.delay }}
          >
            {f.char}
          </Text>
        ))}
        <View className="flex items-baseline justify-between">
          <View className="flex items-center gap-2">
            <Text style={{ fontSize: px(32), color: '#A0AF84' }}>✦</Text>
            <Text className="text-xl font-bold" style={{ color: '#4A6670' }}>纪念日</Text>
          </View>
          <Text className="text-xs" style={{ color: '#668F80' }}>
            {user?.nickname ? `Hi, ${user.nickname} ♡` : ''}
          </Text>
        </View>
      </View>

      {/* 内容区 */}
      <View className="px-4 pb-8 pt-4">
        {loading && items.length === 0 ? (
          <View className="mt-20 flex flex-col items-center gap-3">
            <Text className="float-anim-slow" style={{ fontSize: px(64), color: '#C3B59F' }}>◌</Text>
            <Text className="text-sm" style={{ color: '#C3B59F' }}>加载中…</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="mt-20 flex flex-col items-center gap-3">
            <Text style={{ fontSize: px(96), color: '#D6A2AD' }}>♡</Text>
            <Text className="text-sm" style={{ color: '#C3B59F' }}>暂时还没有纪念日</Text>
          </View>
        ) : (
          <View className="grid grid-cols-2 gap-3">
            {items.map((a) => (
              <AnniversaryCard
                key={a.id}
                item={a}
                onChangeDate={(val) => void handleChangeDate(a, val)}
              />
            ))}
          </View>
        )}
      </View>
      <BottomTabBar current="home" />
    </View>
  )
}

interface CardProps {
  item: AnniversaryDto
  onChangeDate: (val: string) => void
}

function AnniversaryCard({ item, onChangeDate }: CardProps) {
  const stats = computeAnniversaryStats(item.date)
  const pickerVal = isoToPickerValue(item.date)

  return (
    <Picker
      mode="date"
      value={pickerVal}
      onChange={(e) => onChangeDate(String(e.detail.value))}
    >
      <View
        className="flex flex-col gap-1 rounded-2xl bg-white p-4"
        style={{
          border: '1px solid rgba(195,181,159,0.55)',
          boxShadow: `0 ${px(4)} ${px(24)} rgba(74,102,112,0.08)`,
        }}
      >
        <View className="flex items-start justify-between gap-1">
          <Text
            className="flex-1 truncate text-sm font-semibold"
            style={{ color: '#4A6670' }}
          >
            {item.name}
          </Text>
          {item.isSystem ? (
            <View
              className="shrink-0 rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: 'rgba(160,175,132,0.2)' }}
            >
              <Text style={{ fontSize: px(20), color: '#A0AF84' }}>系统</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: px(22), color: '#C3B59F' }}>{formatMonthDay(item.date)}</Text>
        <View className="mt-1 flex items-baseline gap-0.5">
          <Text className="text-2xl font-bold" style={{ color: '#668F80' }}>
            {stats.totalDays}
          </Text>
          <Text style={{ fontSize: px(24), color: '#A0AF84' }}> 天</Text>
        </View>
        <Text style={{ fontSize: px(22), color: stats.daysToNext === 0 ? '#D6A2AD' : '#C3B59F' }}>
          {stats.daysToNext === 0
            ? '就是今天 🎉'
            : `距下次 ${stats.daysToNext} 天`}
        </Text>
      </View>
    </Picker>
  )
}
