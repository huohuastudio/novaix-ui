export function MetricBar({ label, percent, value, sub }: { label: string; percent: number; value: string; sub?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
