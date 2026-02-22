import { useState } from 'react'
import { Users, Settings, Upload } from 'lucide-react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { UsersTab } from './UsersTab'
import { SystemTab } from './SystemTab'
import { ImportJobsTab } from './ImportJobsTab'

const tabs = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'system', label: 'System', icon: Settings },
  { id: 'imports', label: 'Import Jobs', icon: Upload },
] as const

type TabId = (typeof tabs)[number]['id']

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users')

  return (
    <div>
      <PageHeader title="Admin" description="Manage users and system settings" />

      {/* Pill-style tabs */}
      <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'system' && <SystemTab />}
      {activeTab === 'imports' && <ImportJobsTab />}
    </div>
  )
}
