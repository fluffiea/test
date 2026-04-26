import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, type ReactNode } from 'react'
import {
  DEFAULT_REPORT_LIST_FILTER,
  DEFAULT_WITNESS_TAB,
  REPORT_LIST_FILTER_OPTIONS,
  WITNESS_DEFAULT_TAB_OPTIONS,
  type ReportFilter,
  type WitnessDefaultTab,
} from '@momoya/shared'
import { ApiError } from '../../../services/request'
import { userApi } from '../../../services/user'
import { useAuthStore } from '../../../store/authStore'

const px = (n: number) => Taro.pxTransform(n)

type Saving =
  | null
  | { kind: 'witnessTab'; value: WitnessDefaultTab }
  | { kind: 'reportFilter'; value: ReportFilter }

function SettingsCard({
  sectionTitle,
  title,
  hint,
  sectionTopClassName = 'mb-3 mt-6',
  children,
}: {
  sectionTitle: string
  title: string
  hint: string
  /** 第一节用 `mb-3` 即可，避免顶栏下重复大间距 */
  sectionTopClassName?: string
  children: ReactNode
}) {
  return (
    <>
      <View className={`flex items-center gap-2 px-1 ${sectionTopClassName}`}>
        <Text style={{ fontSize: px(24), color: '#A0AF84' }}>⊹</Text>
        <Text className="text-xs font-medium" style={{ color: '#668F80' }}>
          {sectionTitle}
        </Text>
      </View>
      <View
        className="rounded-2xl bg-white p-5"
        style={{
          border: '1px solid rgba(195,181,159,0.5)',
          boxShadow: `0 ${px(4)} ${px(20)} rgba(74,102,112,0.07)`,
        }}
      >
        <Text className="text-sm font-medium" style={{ color: '#4A6670' }}>
          {title}
        </Text>
        {children}
        <Text className="mt-3 leading-relaxed" style={{ fontSize: px(22), color: '#C3B59F' }}>
          {hint}
        </Text>
      </View>
    </>
  )
}

export default function SettingsPage() {
  useLoad(() => {
    if (!useAuthStore.getState().isAuthed()) {
      Taro.reLaunch({ url: '/pages/login/index' })
    }
  })

  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const currentWitnessTab: WitnessDefaultTab =
    user?.settings.defaultWitnessTab ?? DEFAULT_WITNESS_TAB
  const currentReportFilter: ReportFilter =
    user?.settings.defaultReportListFilter ?? DEFAULT_REPORT_LIST_FILTER
  const [saving, setSaving] = useState<Saving>(null)

  const busy = saving !== null

  const handlePickWitnessTab = async (next: WitnessDefaultTab) => {
    if (next === currentWitnessTab || busy) return
    setSaving({ kind: 'witnessTab', value: next })
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

  const handlePickReportFilter = async (next: ReportFilter) => {
    if (next === currentReportFilter || busy) return
    setSaving({ kind: 'reportFilter', value: next })
    try {
      const updated = await userApi.updateMe({
        settings: { defaultReportListFilter: next },
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
      className="min-h-screen px-5 pb-24 pt-6"
      style={{ backgroundColor: 'rgba(195,181,159,0.18)' }}
    >
      <SettingsCard
        sectionTitle="见证页偏好"
        title="进入见证时默认显示"
        hint="点击底部「见证」进入时会默认展示该模块；在见证页内手动切换仅本次有效。"
        sectionTopClassName="mb-3"
      >
        <View
          className="mt-3 flex items-center gap-2 rounded-full p-1"
          style={{ backgroundColor: 'rgba(195,181,159,0.2)' }}
        >
          {WITNESS_DEFAULT_TAB_OPTIONS.map((opt) => {
            const active = opt.value === currentWitnessTab
            const isSaving = saving?.kind === 'witnessTab' && saving.value === opt.value
            return (
              <View
                key={opt.value}
                className="flex-1 rounded-full py-2 text-center"
                style={{ backgroundColor: active ? '#668F80' : 'transparent' }}
                onClick={() => void handlePickWitnessTab(opt.value)}
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
      </SettingsCard>

      <SettingsCard
        sectionTitle="报备列表偏好"
        title="进入见证的「报备」时默认展示"
        hint="打开报备列表时会默认落在此筛选；在见证页内切换筛选仅本次有效。"
      >
        <View
          className="mt-3 flex items-center gap-1.5 rounded-full p-1"
          style={{ backgroundColor: 'rgba(195,181,159,0.2)' }}
        >
          {REPORT_LIST_FILTER_OPTIONS.map((opt) => {
            const active = opt.value === currentReportFilter
            const isSaving = saving?.kind === 'reportFilter' && saving.value === opt.value
            return (
              <View
                key={opt.value}
                className="min-w-0 flex-1 rounded-full py-2 px-0.5 text-center"
                style={{ backgroundColor: active ? '#668F80' : 'transparent' }}
                onClick={() => void handlePickReportFilter(opt.value)}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: active ? '#fff' : '#4A6670' }}
                  numberOfLines={1}
                >
                  {isSaving ? '保存中' : opt.label}
                </Text>
              </View>
            )
          })}
        </View>
      </SettingsCard>
    </View>
  )
}
