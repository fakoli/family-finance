import { create } from 'zustand'
import { get, post } from '@/api/client'
import type { LoginRequest, LoginResponse, User } from '@/api/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: async (credentials) => {
    const res = await post<LoginResponse>('/auth/login', credentials)
    localStorage.setItem('token', res.access_token)
    set({ token: res.access_token, isAuthenticated: true })
    try {
      const user = await get<User>('/auth/me')
      set({ user })
    } catch {
      // token is valid, user fetch failed — not critical
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, isAuthenticated: false })
  },

  hydrate: () => {
    const token = localStorage.getItem('token')
    if (token) {
      set({ token, isAuthenticated: true })
      get<User>('/auth/me')
        .then((user) => set({ user }))
        .catch(() => {
          localStorage.removeItem('token')
          set({ token: null, user: null, isAuthenticated: false })
        })
    }
  },
}))
