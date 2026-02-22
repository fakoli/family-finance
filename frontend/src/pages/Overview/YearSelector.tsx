interface YearSelectorProps {
  year: number
  onChange: (year: number) => void
}

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021]

export function YearSelector({ year, onChange }: YearSelectorProps) {
  return (
    <select
      value={year}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-xl border border-slate-200/60 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
    >
      {YEARS.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}
