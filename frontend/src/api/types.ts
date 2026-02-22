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

// Overview types

export interface MerchantTotal {
  merchant_name: string
  total_cents: number
  transaction_count: number
}

export interface OverviewCategorySpending {
  category_id: string | null
  category_name: string
  annual_cents: number
  monthly_average_cents: number
  transaction_count: number
  top_merchants: MerchantTotal[]
}

export interface SpendingBreakdown {
  year: number
  total_spending_cents: number
  monthly_average_cents: number
  categories: OverviewCategorySpending[]
}

export interface MonthlyMerchantData {
  month: number
  month_name: string
  total_cents: number
  order_count: number
}

export interface MerchantDeepDive {
  merchant_name: string
  year: number
  total_cents: number
  order_count: number
  average_order_cents: number
  monthly: MonthlyMerchantData[]
}

export interface BalanceSheetEntry {
  account_id: string
  account_name: string
  institution_name: string
  account_type: string
  balance_cents: number
  account_number_last4: string | null
}

export interface BalanceSheet {
  assets: BalanceSheetEntry[]
  liabilities: BalanceSheetEntry[]
  total_assets_cents: number
  total_liabilities_cents: number
  net_worth_cents: number
}

export interface MonthlyTrend {
  month: number
  month_name: string
  income_cents: number
  expense_cents: number
  net_cents: number
}

export interface SubscriptionEntry {
  merchant_name: string
  annual_cents: number
  monthly_average_cents: number
  charge_count: number
  frequency: string | null
}

export interface SubscriptionList {
  category_name: string
  total_annual_cents: number
  subscriptions: SubscriptionEntry[]
}

export interface OverviewKPIs {
  total_income_cents: number
  total_spending_cents: number
  monthly_spending_average_cents: number
  monthly_fixed_obligations_cents: number
  transaction_count: number
  date_range_start: string
  date_range_end: string
}

// Net Worth / Brokerage types

export interface NetWorthBreakdownItem {
  label: string
  amount_cents: number
  type: string // "asset" or "liability"
}

export interface NetWorthSummary {
  total_assets_cents: number
  total_liabilities_cents: number
  net_worth_cents: number
  breakdown: NetWorthBreakdownItem[]
}

export interface BrokerageHolding {
  id: string
  user_id: string
  account_id: string
  statement_id: string | null
  symbol: string
  name: string
  quantity: number
  cost_basis_cents: number | null
  market_value_cents: number
  unrealized_gain_cents: number | null
  snapshot_date: string
}

export interface NetWorthHistoryPoint {
  date: string
  net_worth_cents: number
}

export interface AssetAllocationItem {
  category: string
  amount_cents: number
  percentage: number
}

// Tax types

export interface TaxDocument {
  id: string
  user_id: string
  statement_id: string
  form_type: string
  tax_year: number
  issuer: string
  extracted_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface TaxSummary {
  gross_income_cents: number
  total_tax_cents: number
  effective_rate: number
  total_deductions_cents: number
}

export interface IncomeBreakdownItem {
  source: string
  amount_cents: number
  description: string
}
