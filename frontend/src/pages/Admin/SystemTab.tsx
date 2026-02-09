import { Users, ArrowLeftRight, Upload, CheckCircle, XCircle } from 'lucide-react'
import { useAdminStats } from '@/api/hooks'
import { LoadingSpinner } from '@/components/LoadingSpinner'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Users
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-slate-100 p-2">
          <Icon size={18} className="text-slate-600" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

export function SystemTab() {
  const { data: stats, isLoading } = useAdminStats()

  if (isLoading || !stats) {
    return <LoadingSpinner className="py-16" />
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Total Users" value={stats.total_users} icon={Users} />
      <StatCard label="Active Users" value={stats.active_users} icon={Users} />
      <StatCard label="Total Transactions" value={stats.total_transactions} icon={ArrowLeftRight} />
      <StatCard label="Total Import Jobs" value={stats.total_import_jobs} icon={Upload} />
      <StatCard label="Completed Imports" value={stats.completed_import_jobs} icon={CheckCircle} />
      <StatCard label="Failed Imports" value={stats.failed_import_jobs} icon={XCircle} />
    </div>
  )
}
