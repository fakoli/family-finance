import { formatCents } from './format'

export function formatCentsCompact(cents: number): string {
  const dollars = Math.abs(cents / 100)
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 10_000) return `$${Math.round(dollars / 1_000)}K`
  return formatCents(cents)
}
