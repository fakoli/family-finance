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
        <div>
          <span className="font-medium text-slate-900">{row.username}</span>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              row.is_active
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700',
            )}
          >
            {row.is_active ? 'Active' : 'Inactive'}
          </span>
          {row.is_admin && (
            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
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
        <span className="text-xs text-slate-500">
          {row.account_count} accts / {row.transaction_count.toLocaleString()} txns / {row.import_count} imports
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Joined',
      render: (row: AdminUser) => (
        <span className="text-slate-500">{formatDate(row.created_at)}</span>
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
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {row.is_admin ? <ShieldOff size={15} /> : <Shield size={15} />}
          </button>
          <button
            onClick={() => toggleActive(row)}
            title={row.is_active ? 'Deactivate' : 'Activate'}
            className={clsx(
              'rounded p-1.5 hover:bg-slate-100',
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
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
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
