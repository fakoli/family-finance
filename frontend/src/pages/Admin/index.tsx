import { useState } from 'react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { UsersTab } from './UsersTab'
import { SystemTab } from './SystemTab'
import { ImportJobsTab } from './ImportJobsTab'

const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'system', label: 'System' },
  { id: 'imports', label: 'Import Jobs' },
] as const

type TabId = (typeof tabs)[number]['id']

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users')

  return (
    <div>
      <PageHeader title="Admin" description="Manage users and system settings" />

      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'system' && <SystemTab />}
      {activeTab === 'imports' && <ImportJobsTab />}
    </div>
  )
}
