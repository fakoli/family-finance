import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, post, patch, del, uploadFile } from './client'
import type {
  Account,
  AssetAllocationItem,
  BalanceSheet,
  BrokerageHolding,
  Category,
  IncomeBreakdownItem,
  TaxDocument,
  TaxSummary,
  Transaction,
  DashboardSummary,
  ImportRecord,
  AdminUser,
  MerchantDeepDive,
  MonthlyTrend,
  NetWorthHistoryPoint,
  NetWorthSummary,
  OverviewKPIs,
  SpendingBreakdown,
  SubscriptionList,
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

// Overview hooks
const overviewKeys = {
  kpis: (year: number) => ['overview', 'kpis', year] as const,
  spending: (year: number) => ['overview', 'spending', year] as const,
  balanceSheet: ['overview', 'balance-sheet'] as const,
  trend: (year: number) => ['overview', 'trend', year] as const,
  subscriptions: (year: number, category?: string) =>
    ['overview', 'subscriptions', year, category] as const,
  merchantDive: (merchant: string, year: number) =>
    ['overview', 'merchant', merchant, year] as const,
}

export function useOverviewKPIs(year: number) {
  return useQuery({
    queryKey: overviewKeys.kpis(year),
    queryFn: () => get<SingleResponse<OverviewKPIs>>(`/overview/kpi-cards?year=${year}`),
    select: (data) => data.data,
  })
}

export function useSpendingBreakdown(year: number) {
  return useQuery({
    queryKey: overviewKeys.spending(year),
    queryFn: () =>
      get<SingleResponse<SpendingBreakdown>>(`/overview/spending-breakdown?year=${year}`),
    select: (data) => data.data,
  })
}

export function useBalanceSheet() {
  return useQuery({
    queryKey: overviewKeys.balanceSheet,
    queryFn: () => get<SingleResponse<BalanceSheet>>('/overview/balance-sheet'),
    select: (data) => data.data,
  })
}

export function useIncomeExpenseTrend(year: number) {
  return useQuery({
    queryKey: overviewKeys.trend(year),
    queryFn: () => get<SingleResponse<MonthlyTrend[]>>(`/overview/income-expense-trend?year=${year}`),
    select: (data) => data.data,
  })
}

export function useSubscriptions(year: number, category?: string) {
  const params = new URLSearchParams({ year: String(year) })
  if (category) params.set('category_name', category)
  return useQuery({
    queryKey: overviewKeys.subscriptions(year, category),
    queryFn: () =>
      get<SingleResponse<SubscriptionList>>(`/overview/subscriptions?${params.toString()}`),
    select: (data) => data.data,
  })
}

export function useMerchantDeepDive(merchantName: string, year: number) {
  return useQuery({
    queryKey: overviewKeys.merchantDive(merchantName, year),
    queryFn: () =>
      get<SingleResponse<MerchantDeepDive>>(
        `/overview/merchant-deep-dive?merchant_name=${encodeURIComponent(merchantName)}&year=${year}`,
      ),
    select: (data) => data.data,
    enabled: !!merchantName,
  })
}

// Brokerage / Net Worth hooks
const brokerageKeys = {
  summary: ['brokerage', 'summary'] as const,
  holdings: ['brokerage', 'holdings'] as const,
  history: ['brokerage', 'history'] as const,
  allocation: ['brokerage', 'allocation'] as const,
}

export function useNetWorthSummary() {
  return useQuery({
    queryKey: brokerageKeys.summary,
    queryFn: () => get<SingleResponse<NetWorthSummary>>('/brokerage/summary'),
    select: (data) => data.data,
  })
}

export function useBrokerageHoldings() {
  return useQuery({
    queryKey: brokerageKeys.holdings,
    queryFn: () => get<PaginatedResponse<BrokerageHolding>>('/brokerage/holdings'),
    select: (data) => data.data,
  })
}

export function useNetWorthHistory() {
  return useQuery({
    queryKey: brokerageKeys.history,
    queryFn: () => get<SingleResponse<NetWorthHistoryPoint[]>>('/brokerage/history'),
    select: (data) => data.data,
  })
}

export function useAssetAllocation() {
  return useQuery({
    queryKey: brokerageKeys.allocation,
    queryFn: () => get<SingleResponse<AssetAllocationItem[]>>('/brokerage/allocation'),
    select: (data) => data.data,
  })
}

// Tax hooks
const taxKeys = {
  summary: (year: number) => ['tax', 'summary', year] as const,
  documents: (year: number) => ['tax', 'documents', year] as const,
  incomeBreakdown: (year: number) => ['tax', 'income-breakdown', year] as const,
  deductible: (year: number) => ['tax', 'deductible', year] as const,
}

export function useTaxSummary(year: number) {
  return useQuery({
    queryKey: taxKeys.summary(year),
    queryFn: () => get<SingleResponse<TaxSummary>>(`/tax/summary?year=${year}`),
    select: (data) => data.data,
  })
}

export function useTaxDocuments(year: number) {
  return useQuery({
    queryKey: taxKeys.documents(year),
    queryFn: () => get<PaginatedResponse<TaxDocument>>(`/tax/documents?year=${year}`),
    select: (data) => data.data,
  })
}

export function useIncomeBreakdown(year: number) {
  return useQuery({
    queryKey: taxKeys.incomeBreakdown(year),
    queryFn: () => get<SingleResponse<IncomeBreakdownItem[]>>(`/tax/income-breakdown?year=${year}`),
    select: (data) => data.data,
  })
}

export function useTaxDeductibleTransactions(year: number) {
  return useQuery({
    queryKey: taxKeys.deductible(year),
    queryFn: () => get<PaginatedResponse<Transaction>>(`/tax/deductible?year=${year}`),
    select: (data) => data.data,
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
