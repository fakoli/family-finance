import { Inbox } from 'lucide-react'
import { clsx } from 'clsx'

interface EmptyStateProps {
  title: string
  description?: string
  className?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, className, action }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 text-center', className)}>
      <Inbox size={48} className="mb-4 text-slate-300" />
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
