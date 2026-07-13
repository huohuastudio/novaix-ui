import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useDebounce } from "@uidotdev/usehooks"
import { postAdminInstancesByIdMigrate } from "@/api"
import { getAdminNodesOptions } from "@/api/@tanstack/react-query.gen"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SimplePagination } from "@/components/simple-pagination"
import { Spinner } from "@/components/ui/spinner"
import { useTasks } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

const PAGE_SIZE = 20

interface MigrateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  instanceId: number
  instanceName: string
  currentNodeId: number
  onSuccess: () => void
}

export function MigrateDialog({ open, onOpenChange, instanceId, instanceName, currentNodeId, onSuccess }: MigrateDialogProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const keyword = useDebounce(search, 300)
  const [targetNodeId, setTargetNodeId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { addTask } = useTasks()

  // 弹窗打开才取数；page/keyword/currentNodeId 通过 options 参数进入 queryKey
  const nodesQuery = useQuery({
    ...getAdminNodesOptions({
      query: { page, page_size: PAGE_SIZE, status: 1, exclude_id: currentNodeId, keyword: keyword || undefined },
    }),
    enabled: open,
  })
  const nodes = nodesQuery.data?.data?.items ?? []
  const total = nodesQuery.data?.data?.total ?? 0
  const fetching = nodesQuery.isLoading

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 对话框打开时重置状态
    setTargetNodeId("")
    setSearch("")
    setPage(1)
  }, [open])

  const handleMigrate = async () => {
    if (!targetNodeId) return
    setLoading(true)
    try {
      const { data: res } = await postAdminInstancesByIdMigrate({
        path: { id: instanceId },
        body: { target_node_id: Number(targetNodeId) },
      })
      if (res?.code === 0) {
        const data = res.data as { task_id?: number; migration_type?: string }
        if (data?.task_id) {
          addTask(data.task_id, data.migration_type === "live" ? "live_migrate_instance" : "migrate_instance")
        }
        const typeLabel = data?.migration_type === "live" ? "在线迁移" : "离线迁移"
        toast.success(`${typeLabel}任务已提交`)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error((res as { message?: string })?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>迁移实例</DialogTitle>
          <DialogDescription>
            将实例「{instanceName}」迁移到另一个节点。同集群内的虚拟机支持在线迁移（无需停机），其他情况需先停止实例。
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索节点名称/地址..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {fetching ? (
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : nodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {keyword ? "未找到匹配的在线节点" : "无可用节点"}
            </p>
          ) : (
            nodes.map((node) => (
              <label
                key={node.id}
                className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted cursor-pointer"
              >
                <input
                  type="radio"
                  name="target-node"
                  className="size-4"
                  checked={targetNodeId === String(node.id)}
                  onChange={() => setTargetNodeId(String(node.id!))}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{node.name}</p>
                  <p className="text-xs text-muted-foreground">{node.region || "未设置区域"}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <SimplePagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleMigrate} disabled={!targetNodeId || loading}>
            {loading && <Spinner />}
            开始迁移
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
