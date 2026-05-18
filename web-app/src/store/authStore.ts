import { create } from 'zustand'
import { api } from '@/lib/api'
import { useNotesStore } from '@/store/notesStore'

interface AuthState {
  token: string | null
  userId: number | null
  username: string
  loading: boolean
  error: string | null

  setUsername: (v: string) => void
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<boolean>
  clearError: () => void
}

const TOKEN_KEY = 'cloud_notes_token'

function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function saveToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // ignore
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: loadToken(),
  userId: null,
  username: '',
  loading: false,
  error: null,

  setUsername: (v) => set({ username: v }),

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const res = await api.login(username, password)
      const token = res.token
      saveToken(token)
      api.setToken(token)
      set({ token, loading: false })

      // 获取用户信息
      try {
        const profile = await api.profile()
        set({ userId: profile.user_id })
      } catch {
        // profile fetch is non-critical
      }
      return true
    } catch (e: any) {
      set({ loading: false, error: e.message })
      return false
    }
  },

  register: async (username, password) => {
    set({ loading: true, error: null })
    try {
      await api.register(username, password)
      set({ loading: false })
      return true
    } catch (e: any) {
      set({ loading: false, error: e.message })
      return false
    }
  },

  logout: () => {
    saveToken(null)
    api.setToken(null)
    set({ token: null, userId: null, username: '', error: null })
    useNotesStore.getState().reset()
  },

  checkAuth: async () => {
    const token = get().token
    if (!token) return false
    api.setToken(token)
    try {
      const profile = await api.profile()
      set({ userId: profile.user_id })
      return true
    } catch {
      get().logout()
      return false
    }
  },

  clearError: () => set({ error: null }),
}))
