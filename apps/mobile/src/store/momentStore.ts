import { create } from 'zustand'
import type { MomentDto } from '@momoya/shared'
import { momentApi } from '../services/moment'

interface MomentState {
  items: MomentDto[]
  cursor: string | null
  hasMore: boolean
  loading: boolean
  refreshing: boolean
  error: string | null

  /** 重置到首屏（登录切账号 / 拉取失败重试时使用） */
  reset: () => void
  /** 下拉刷新：丢掉旧数据重新拉首屏 */
  refresh: () => Promise<void>
  /** 触底分页：cursor 已到底时是 no-op */
  fetchNext: () => Promise<void>
  /** 新发布的动态塞到列表头 */
  prepend: (m: MomentDto) => void
  /** 删除后本地同步剔除 */
  removeById: (id: string) => void
}

export const useMomentStore = create<MomentState>((set, get) => ({
  items: [],
  cursor: null,
  hasMore: true,
  loading: false,
  refreshing: false,
  error: null,

  reset: () => {
    set({ items: [], cursor: null, hasMore: true, loading: false, refreshing: false, error: null })
  },

  refresh: async () => {
    if (get().refreshing) return
    set({ refreshing: true, error: null })
    try {
      const res = await momentApi.list(null)
      set({
        items: res.items,
        cursor: res.nextCursor,
        hasMore: !!res.nextCursor,
        refreshing: false,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败'
      set({ refreshing: false, error: msg })
      throw err
    }
  },

  fetchNext: async () => {
    const { loading, hasMore, cursor } = get()
    if (loading || !hasMore) return
    set({ loading: true, error: null })
    try {
      const res = await momentApi.list(cursor)
      set((s) => ({
        items: [...s.items, ...res.items],
        cursor: res.nextCursor,
        hasMore: !!res.nextCursor,
        loading: false,
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败'
      set({ loading: false, error: msg })
      throw err
    }
  },

  prepend: (m) => {
    set((s) => ({ items: [m, ...s.items] }))
  },

  removeById: (id) => {
    set((s) => ({ items: s.items.filter((m) => m.id !== id) }))
  },
}))
