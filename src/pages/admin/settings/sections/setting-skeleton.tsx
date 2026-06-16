import { Skeleton } from "@/components/ui/skeleton"

export function SettingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="max-w-2xl space-y-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}
