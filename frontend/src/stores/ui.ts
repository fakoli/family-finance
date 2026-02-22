import { create } from 'zustand'

interface UiState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleCollapsed: () => void
}

const savedCollapsed = typeof window !== 'undefined'
  ? localStorage.getItem('sidebar-collapsed') === 'true'
  : false

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: savedCollapsed,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCollapsed: () =>
    set((s) => {
      const next = !s.sidebarCollapsed
      localStorage.setItem('sidebar-collapsed', String(next))
      return { sidebarCollapsed: next }
    }),
}))
