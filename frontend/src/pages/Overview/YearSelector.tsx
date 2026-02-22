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
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
    >
      {YEARS.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}
