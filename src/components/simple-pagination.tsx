import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SimplePaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function SimplePagination({ page, pageSize, total, onChange }: SimplePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-sm text-muted-foreground">共 {total} 条</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2 text-sm tabular-nums">{page} / {totalPages}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
