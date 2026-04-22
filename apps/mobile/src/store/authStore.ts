import { create } from 'zustand'
import { clearAuthStorage, readStorage, StorageKey, writeStorage } from '../services/storage'
import type { MeDto, TokenPair } from '../types/auth'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: MeDto | null
  /** 启动时是否已经尝试过从 storage 恢复状态。未 hydrate 前不要做跳转决策。 */
  hydrated: boolean

  hydrate: () => void
  setTokens: (tokens: TokenPair) => void
  setUser: (user: MeDto) => void
  login: (payload: TokenPair & { user: MeDto }) => void
  logout: () => void
  isAuthed: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  hydrate: () => {
    const accessToken = readStorage<string>(StorageKey.AccessToken)
    const refreshToken = readStorage<string>(StorageKey.RefreshToken)
    const user = readStorage<MeDto>(StorageKey.User)
    set({ accessToken, refreshToken, user, hydrated: true })
  },

  setTokens: ({ accessToken, refreshToken }) => {
    writeStorage(StorageKey.AccessToken, accessToken)
    writeStorage(StorageKey.RefreshToken, refreshToken)
    set({ accessToken, refreshToken })
  },

  setUser: (user) => {
    writeStorage(StorageKey.User, user)
    set({ user })
  },

  login: ({ accessToken, refreshToken, user }) => {
    writeStorage(StorageKey.AccessToken, accessToken)
    writeStorage(StorageKey.RefreshToken, refreshToken)
    writeStorage(StorageKey.User, user)
    set({ accessToken, refreshToken, user })
  },

  logout: () => {
    clearAuthStorage()
    set({ accessToken: null, refreshToken: null, user: null })
  },

  isAuthed: () => {
    const s = get()
    return !!s.accessToken && !!s.refreshToken
  },
}))
