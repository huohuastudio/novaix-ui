import { Skeleton } from "@/components/ui/skeleton"
import { useContainerSize } from "@/hooks/use-container-size"

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

interface ChartCardProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  legend?: React.ReactNode
  children: (size: { width: number; height: number }) => React.ReactNode
}

export function ChartCard({ title, icon: Icon, legend, children }: ChartCardProps) {
  const { ref, width, height } = useContainerSize<HTMLDivElement>()
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h4 className="text-[13px] font-medium">{title}</h4>
        </div>
        {legend}
      </div>
      <div ref={ref} className="h-52 min-h-0 min-w-0">
        {width > 0 && height > 0 ? children({ width, height }) : <Skeleton className="h-full w-full" />}
      </div>
    </div>
  )
}
