import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ children, className, interactive, padding = 'md' }: CardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-5 lg:p-6',
    lg: 'p-6 lg:p-8',
  }

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200/60 bg-white shadow-sm',
        interactive && 'hover:shadow-lg transition-shadow duration-200 cursor-pointer',
        paddings[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}
