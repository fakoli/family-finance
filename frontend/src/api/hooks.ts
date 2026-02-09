import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, post, patch, del, uploadFile } from './client'
import type {
  Account,
  Category,
  Transaction,
  DashboardSummary,
  ImportRecord,
  AdminUser,
  SystemStats,
  AdminUserCreate,
  AdminUserUpdate,
  PaginatedResponse,
  SingleResponse,
  TransactionFilters,
  CategorizeResponse,
  QueryResponse,
} from './types'

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'partially_failed'])

const keys = {
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
  transactions: (filters: TransactionFilters) => ['transactions', filters] as const,
  dashboard: (dateFrom: string, dateTo: string) => ['dashboard', dateFrom, dateTo] as const,
  imports: ['imports'] as const,
  importJob: (id: string) => ['imports', id] as const,
  categories: ['categories'] as const,
}

export function useAccounts() {
  return useQuery({
    queryKey: keys.accounts,
    queryFn: () => get<PaginatedResponse<Account>>('/accounts?per_page=200'),
    select: (data) => data.data,
  })
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: keys.account(id),
    queryFn: () => get<SingleResponse<Account>>(`/accounts/${id}`),
    select: (data) => data.data,
    enabled: !!id,
  })
}

export function useTransactions(filters: TransactionFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.per_page) params.set('per_page', String(filters.per_page))
  if (filters.account_id) params.set('account_id', filters.account_id)
  if (filters.category_id) params.set('category_id', filters.category_id)
  if (filters.search) params.set('search', filters.search)
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)

  const qs = params.toString()
  return useQuery({
    queryKey: keys.transactions(filters),
    queryFn: () => get<PaginatedResponse<Transaction>>(`/transactions${qs ? `?${qs}` : ''}`),
  })
}

export function useDashboardSummary(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: keys.dashboard(dateFrom, dateTo),
    queryFn: () =>
      get<SingleResponse<DashboardSummary>>(
        `/dashboard/summary?date_from=${dateFrom}&date_to=${dateTo}`,
      ),
    select: (data) => data.data,
  })
}

export function useImportHistory() {
  return useQuery({
    queryKey: keys.imports,
    queryFn: () => get<PaginatedResponse<ImportRecord>>('/imports/history'),
    refetchInterval: (query) => {
      const jobs = query.state.data?.data ?? []
      const hasActiveJobs = jobs.some((job) => !TERMINAL_STATUSES.has(job.status))
      return hasActiveJobs ? 5000 : false
    },
  })
}

export function useImportJobProgress(jobId: string | null) {
  return useQuery({
    queryKey: keys.importJob(jobId ?? ''),
    queryFn: () => get<SingleResponse<ImportRecord>>(`/imports/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      if (status && TERMINAL_STATUSES.has(status)) return false
      return 2000
    },
  })
}

export function useUploadImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadFile<SingleResponse<ImportRecord>>('/imports/upload', file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.imports })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; category_id?: string | null; note?: string }) =>
      request<SingleResponse<Transaction>>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => get<PaginatedResponse<Category>>('/categories'),
    select: (data) => data.data,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (account: { institution_id: string; name: string; account_type: string; account_number_last4?: string; is_shared?: boolean }) =>
      post<SingleResponse<Account>>('/accounts', account),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.accounts })
    },
  })
}

// AI hooks
export function useAICategorize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { transaction_ids: string[]; provider?: string }) =>
      post<SingleResponse<CategorizeResponse>>('/ai/categorize', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useAICategorizeAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => post<SingleResponse<CategorizeResponse>>('/ai/categorize-all', {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: keys.categories })
    },
  })
}

export function useAIQuery() {
  return useMutation({
    mutationFn: (body: { question: string; provider?: string }) =>
      post<SingleResponse<QueryResponse>>('/ai/query', body),
  })
}

// Admin hooks
const adminKeys = {
  users: ['admin', 'users'] as const,
  stats: ['admin', 'stats'] as const,
  importJobs: ['admin', 'import-jobs'] as const,
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => get<PaginatedResponse<AdminUser>>('/admin/users'),
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: () => get<SingleResponse<SystemStats>>('/admin/stats'),
    select: (data) => data.data,
  })
}

export function useAdminImportJobs() {
  return useQuery({
    queryKey: adminKeys.importJobs,
    queryFn: () => get<PaginatedResponse<ImportRecord>>('/admin/import-jobs'),
  })
}

export function useAdminCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AdminUserCreate) =>
      post<SingleResponse<AdminUser>>('/admin/users', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users })
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats })
    },
  })
}

export function useAdminUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: AdminUserUpdate & { id: string }) =>
      patch<SingleResponse<AdminUser>>(`/admin/users/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users })
    },
  })
}

export function useAdminDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del<SingleResponse<AdminUser>>(`/admin/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users })
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats })
    },
  })
}

// Re-export request for direct use
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`/api/v1${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? res.statusText)
  }
  return res.json() as Promise<T>
}
