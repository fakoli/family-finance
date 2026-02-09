import { format } from 'date-fns'

interface DateRangePickerProps {
  dateFrom: string
  dateTo: string
  onChange: (from: string, to: string) => void
}

export function DateRangePicker({ dateFrom, dateTo, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => onChange(e.target.value, dateTo)}
        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 focus:border-slate-400 focus:outline-none"
      />
      <span className="text-slate-400">to</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => onChange(dateFrom, e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 focus:border-slate-400 focus:outline-none"
      />
    </div>
  )
}

export function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd'),
  }
}
