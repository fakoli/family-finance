import type { CSSProperties } from 'react'

export const chartColors = {
  income: '#10b981',
  expense: '#f43f5e',
  brand: '#0d9488',
  accent: '#6366f1',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  sky: '#0ea5e9',
  orange: '#f97316',
  indigo: '#6366f1',
  palette: ['#0d9488', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316', '#10b981'],
}

export const chartGrid = {
  stroke: '#f1f5f9',
  strokeDasharray: '',
}

export const chartTooltipStyle: CSSProperties = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  fontSize: '13px',
  padding: '8px 12px',
  backgroundColor: '#ffffff',
}

export const chartAxis = {
  fontSize: 12,
  tickLine: false,
  axisLine: false,
  tick: { fill: '#94a3b8' },
}

export function formatChartCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return `$${(value / 1_000).toFixed(0)}K`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}
