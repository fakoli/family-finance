import { formatCents } from '@/utils/format'
import { clsx } from 'clsx'

interface AmountDisplayProps {
  cents: number
  className?: string
  colorize?: boolean
}

export function AmountDisplay({ cents, className, colorize = true }: AmountDisplayProps) {
  const isNegative = cents < 0

  return (
    <span
      className={clsx(
        'tabular-nums font-medium',
        colorize && isNegative && 'text-income',
        colorize && !isNegative && cents > 0 && 'text-expense',
        className,
      )}
    >
      {isNegative ? '+' : ''}
      {formatCents(Math.abs(cents))}
    </span>
  )
}
