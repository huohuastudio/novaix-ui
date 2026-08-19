import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { InfoIcon, Search } from "lucide-react"
import { useDebounce } from "@uidotdev/usehooks"
import type { NodeNodeItem } from "@/api"
import { getAdminNodesOptions } from "@/api/@tanstack/react-query.gen"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { SimplePagination } from "@/components/simple-pagination"

const PAGE_SIZE = 20

interface NodeSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: (count: number) => string
  submitting: boolean
  onSubmit: (nodeIds: number[]) => void
}

export default function NodeSelectDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  submitting,
  onSubmit,
}: NodeSelectDialogProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const keyword = useDebounce(search, 300)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const nodesQuery = useQuery({
    ...getAdminNodesOptions({
      query: { page, page_size: PAGE_SIZE, status: 1, keyword: keyword || undefined },
    }),
    enabled: open,
  })
  const nodes = useMemo(() => nodesQuery.data?.data?.items ?? [], [nodesQuery.data])
  const total = nodesQuery.data?.data?.total ?? 0
  const loading = nodesQuery.isPending

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 对话框打开时重置状态
    setSelected(new Set())
    setSearch("")
    setPage(1)
  }, [open])

  const regions = useMemo(() => {
    const map = new Map<string, { label: string; nodes: NodeNodeItem[] }>()
    for (const node of nodes) {
      const key = node.region_id != null ? String(node.region_id) : "0"
      const label = node.region_display_name || "未分区"
      const entry = map.get(key) ?? { label, nodes: [] }
      entry.nodes.push(node)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [nodes])

  const toggleNode = useCallback((id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleRegion = useCallback((regionNodes: NodeNodeItem[]) => {
    setSelected(prev => {
      const next = new Set(prev)
      const allChecked = regionNodes.every(n => next.has(n.id!))
      if (allChecked) {
        regionNodes.forEach(n => next.delete(n.id!))
      } else {
        regionNodes.forEach(n => next.add(n.id!))
      }
      return next
    })
  }, [])

  const handleSubmit = () => {
    if (selected.size === 0) return
    onSubmit(Array.from(selected))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Alert>
          <InfoIcon className="size-4" />
          <AlertDescription>
            镜像将由所选节点主动从服务器下载，请确保节点能访问本系统。
          </AlertDescription>
        </Alert>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索节点名称/地址..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
                  <Skeleton className="size-4 rounded" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : nodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {keyword ? "未找到匹配的在线节点" : "暂无在线节点"}
            </p>
          ) : (
            <div className="space-y-3">
              {regions.map((group) => {
                const regionNodes = group.nodes
                const regionChecked = regionNodes.every(n => selected.has(n.id!))
                const regionSelectedCount = regionNodes.filter(n => selected.has(n.id!)).length
                return (
                  <div key={group.label}>
                    <label className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-1.5 hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        className="size-4 rounded"
                        checked={regionChecked}
                        ref={(el) => { if (el) el.indeterminate = regionSelectedCount > 0 && !regionChecked }}
                        onChange={() => toggleRegion(regionNodes)}
                      />
                      <span className="text-sm font-medium">{group.label}</span>
                      <span className="text-xs text-muted-foreground">{regionSelectedCount}/{regionNodes.length}</span>
                    </label>
                    <div className="mt-1 space-y-1 pl-4">
                      {regionNodes.map(node => (
                        <label
                          key={node.id}
                          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="size-4 rounded"
                            checked={selected.has(node.id!)}
                            onChange={() => toggleNode(node.id!)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{node.name}</p>
                            <p className="text-xs text-muted-foreground">{node.host}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <SimplePagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || selected.size === 0}>
            {submitting ? "提交中..." : submitLabel(selected.size)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
