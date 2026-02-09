export interface Institution {
  id: string
  name: string
  created_at: string
}

export interface Account {
  id: string
  user_id: string | null
  institution_id: string
  name: string
  account_type: string
  account_number_last4: string | null
  is_shared: boolean
  balance_cents: number
  institution: Institution | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
  icon: string | null
  color: string | null
  is_system: boolean
  created_at: string
  children?: Category[]
}

export interface Transaction {
  id: string
  account_id: string
  date: string
  original_date: string | null
  amount_cents: number
  description: string
  original_description: string | null
  merchant_name: string | null
  category_id: string | null
  custom_name: string | null
  note: string | null
  is_transfer: boolean
  is_tax_deductible: boolean
  tags: Record<string, unknown> | null
  import_job_id: string | null
  account: Account | null
  category: Category | null
  created_at: string
  updated_at: string
}

export interface SpendingByCategory {
  category_id: string | null
  category_name: string
  total_cents: number
  transaction_count: number
}

export interface AccountBalance {
  account_id: string
  account_name: string
  institution_name: string
  account_type: string
  balance_cents: number
}

export interface DashboardSummary {
  income_cents: number
  expense_cents: number
  net_cents: number
  spending_by_category: SpendingByCategory[]
  account_balances: AccountBalance[]
  transaction_count: number
}

export interface ImportRecord {
  id: string
  user_id: string
  filename: string
  source_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'categorizing' | 'partially_failed'
  total_rows: number
  imported_rows: number
  duplicate_rows: number
  processed_rows: number
  categorized_rows: number
  uncategorized_rows: number
  error_message: string | null
  celery_task_id: string | null
  source: string
  file_path: string | null
  created_at: string
  completed_at: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
}

export interface SingleResponse<T> {
  data: T
}

export interface TransactionFilters {
  page?: number
  per_page?: number
  account_id?: string
  category_id?: string
  search?: string
  date_from?: string
  date_to?: string
}

export interface CategorizeResult {
  transaction_id: string
  category_name: string
  confidence: number
  merchant_normalized: string | null
}

export interface CategorizeResponse {
  results: CategorizeResult[]
}

export interface QueryResponse {
  answer: string
  data: Record<string, unknown> | null
}

export interface AdminUser {
  id: string
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
  account_count: number
  transaction_count: number
  import_count: number
}

export interface SystemStats {
  total_users: number
  active_users: number
  total_transactions: number
  total_import_jobs: number
  completed_import_jobs: number
  failed_import_jobs: number
}

export interface AdminUserCreate {
  username: string
  email: string
  password: string
  is_admin: boolean
}

export interface AdminUserUpdate {
  is_active?: boolean
  is_admin?: boolean
  password?: string
}
