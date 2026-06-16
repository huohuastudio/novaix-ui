import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { InfoIcon, Search } from "lucide-react"
import { useDebounce } from "@uidotdev/usehooks"
import { getAdminNodes, postAdminImagesByIdDistribute } from "@/api"
import type { ImageImageItem, NodeNodeItem } from "@/api"
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
import { useTasks } from "@/hooks/use-tasks"
import { getErrorMessage } from "@/lib/utils"

const PAGE_SIZE = 20

interface DistributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageImageItem | null
}

export default function DistributeDialog({ open, onOpenChange, image }: DistributeDialogProps) {
  const [nodes, setNodes] = useState<NodeNodeItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const keyword = useDebounce(search, 300)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const { addTask } = useTasks()

  const fetchIdRef = useRef(0)

  const fetchNodes = useCallback(async (p: number, kw: string) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    try {
      const { data: res } = await getAdminNodes({
        query: { page: p, page_size: PAGE_SIZE, status: 1, keyword: kw || undefined },
      })
      if (id !== fetchIdRef.current) return
      setNodes(res?.data?.items ?? [])
      setTotal(res?.data?.total ?? 0)
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 对话框打开时重置状态
    setSelected(new Set())
    setSearch("")
    setPage(1)
  }, [open])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keyword 变化时获取数据
    if (open) fetchNodes(page, keyword)
  }, [open, page, keyword, fetchNodes])

  // 按区域分组
  const regions = useMemo(() => {
    const map = new Map<string, NodeNodeItem[]>()
    for (const node of nodes) {
      const region = node.region || "未分区"
      const list = map.get(region) ?? []
      list.push(node)
      map.set(region, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
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

  const handleSubmit = async () => {
    if (!image || selected.size === 0) return
    setSubmitting(true)
    try {
      const { data: res } = await postAdminImagesByIdDistribute({
        path: { id: image.id! },
        body: { node_ids: Array.from(selected) },
      })
      if (res?.code === 0) {
        const taskIds = res.data as number[]
        for (const tid of taskIds) addTask(tid, "distribute_image")
        toast.success(`已创建 ${taskIds.length} 个分发任务`, {
          description: "可在任务列表中查看进度",
        })
        onOpenChange(false)
      } else {
        toast.error(res?.message ?? "分发失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败，请重试"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分发镜像到节点</DialogTitle>
          <DialogDescription>
            将镜像「{image?.name}」分发到选中的节点
          </DialogDescription>
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
              {regions.map(([region, regionNodes]) => {
                const regionChecked = regionNodes.every(n => selected.has(n.id!))
                const regionSelectedCount = regionNodes.filter(n => selected.has(n.id!)).length
                return (
                  <div key={region}>
                    <label className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-1.5 hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        className="size-4 rounded"
                        checked={regionChecked}
                        ref={(el) => { if (el) el.indeterminate = regionSelectedCount > 0 && !regionChecked }}
                        onChange={() => toggleRegion(regionNodes)}
                      />
                      <span className="text-sm font-medium">{region}</span>
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
            {submitting ? "提交中..." : `分发到 ${selected.size} 个节点`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
