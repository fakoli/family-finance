import { Inbox } from 'lucide-react'
import { clsx } from 'clsx'

interface EmptyStateProps {
  title: string
  description?: string
  className?: string
  action?: React.ReactNode
  illustration?: string
}

export function EmptyState({ title, description, className, action, illustration }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 text-center animate-fade-in-up', className)}>
      {illustration ? (
        <img
          src={illustration}
          alt=""
          className="mb-6 max-w-[200px] opacity-80"
        />
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Inbox size={28} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
