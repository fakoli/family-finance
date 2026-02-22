import { useState } from 'react'
import { Shield, ShieldOff, UserX, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { useAdminUsers, useAdminUpdateUser, useAdminDeactivateUser } from '@/api/hooks'
import { formatDate } from '@/utils/format'
import { DataTable } from '@/components/DataTable'
import { CreateUserModal } from './CreateUserModal'
import type { AdminUser } from '@/api/types'

export function UsersTab() {
  const { data, isLoading } = useAdminUsers()
  const updateUser = useAdminUpdateUser()
  const deactivateUser = useAdminDeactivateUser()
  const [showCreate, setShowCreate] = useState(false)

  const toggleAdmin = (user: AdminUser) => {
    updateUser.mutate({ id: user.id, is_admin: !user.is_admin })
  }

  const toggleActive = (user: AdminUser) => {
    if (user.is_active) {
      deactivateUser.mutate(user.id)
    } else {
      updateUser.mutate({ id: user.id, is_active: true })
    }
  }

  const columns = [
    {
      key: 'username',
      header: 'User',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {row.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-medium text-slate-900">{row.username}</span>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'h-2 w-2 rounded-full',
                row.is_active ? 'bg-emerald-500' : 'bg-red-400',
              )}
            />
            <span
              className={clsx(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                row.is_active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700',
              )}
            >
              {row.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {row.is_admin && (
            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              Admin
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-0.5">{row.account_count} accts</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5">{row.transaction_count.toLocaleString()} txns</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5">{row.import_count} imports</span>
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Joined',
      render: (row: AdminUser) => (
        <span className="text-sm text-slate-500">{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleAdmin(row)}
            title={row.is_admin ? 'Remove admin' : 'Make admin'}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            {row.is_admin ? <ShieldOff size={15} /> : <Shield size={15} />}
          </button>
          <button
            onClick={() => toggleActive(row)}
            title={row.is_active ? 'Deactivate' : 'Activate'}
            className={clsx(
              'rounded-lg p-2 transition-colors hover:bg-slate-100',
              row.is_active
                ? 'text-slate-400 hover:text-red-600'
                : 'text-red-400 hover:text-emerald-600',
            )}
          >
            <UserX size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <Plus size={15} />
          Create User
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        isLoading={isLoading}
        emptyTitle="No users"
        emptyDescription="Create your first user to get started"
      />

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
