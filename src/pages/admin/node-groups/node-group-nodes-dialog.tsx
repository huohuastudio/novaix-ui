import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@uidotdev/usehooks"
import {
  postAdminNodeGroupsByIdNodes,
  deleteAdminNodeGroupsByIdNodesByNodeId,
} from "@/api"
import type { NodeGroupNodeInGroupItem } from "@/api"
import {
  getAdminNodeGroupsByIdNodesOptions,
  getAdminNodeGroupsByIdNodesQueryKey,
  getAdminNodesOptions,
  getAdminNodesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SimplePagination } from "@/components/simple-pagination"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { statusMap } from "@/lib/node-constants"
import { getErrorMessage } from "@/lib/utils"

const PAGE_SIZE = 20

interface Props {
  group?: { id?: number; name?: string }
  onClose: () => void
  onChanged?: () => void
}

export default function NodeGroupNodesDialog({ group, onClose, onChanged }: Props) {
  const queryClient = useQueryClient()
  const [availablePage, setAvailablePage] = useState(1)
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")
  const [adding, setAdding] = useState(false)
  const [nodeSearch, setNodeSearch] = useState("")
  const keyword = useDebounce(nodeSearch, 300)

  // 组内节点：group.id 经 options 进入 query key，对话框打开（group 存在）时才取数
  const groupNodesQuery = useQuery({
    ...getAdminNodeGroupsByIdNodesOptions({ path: { id: group?.id ?? 0 } }),
    enabled: !!group?.id,
  })
  const nodes = (groupNodesQuery.data?.data as NodeGroupNodeInGroupItem[]) ?? []
  const loading = groupNodesQuery.isPending

  // 可添加的独立节点：分页 + 搜索关键字经 options 进入 query key
  const availableQuery = useQuery({
    ...getAdminNodesOptions({
      query: { page: availablePage, page_size: PAGE_SIZE, ungrouped: true, keyword: keyword || undefined },
    }),
    enabled: !!group?.id,
  })
  const availableNodes = availableQuery.data?.data?.items ?? []
  const availableTotal = availableQuery.data?.data?.total ?? 0

  useEffect(() => {
    if (group?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时重置搜索与选中状态
      setNodeSearch("")
      setSelectedNodeId("")
      setAvailablePage(1)
    }
  }, [group?.id])

  // 当前页数据为空但总数不为 0 时（如移除后页码越界），回退到最后一页
  useEffect(() => {
    const items = availableQuery.data?.data?.items
    const total = availableQuery.data?.data?.total ?? 0
    if (items && items.length === 0 && availablePage > 1 && total > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 服务器数据驱动的页码修正
      setAvailablePage(Math.max(1, Math.ceil(total / PAGE_SIZE)))
    }
  }, [availableQuery.data, availablePage])

  const invalidateNodeQueries = () => {
    if (group?.id) {
      queryClient.invalidateQueries({
        queryKey: getAdminNodeGroupsByIdNodesQueryKey({ path: { id: group.id } }),
      })
    }
    // 前缀匹配失效所有节点列表查询（覆盖不同分页/关键字）
    queryClient.invalidateQueries({ queryKey: getAdminNodesQueryKey() })
  }

  const handleAdd = async () => {
    if (!group?.id || !selectedNodeId) return
    setAdding(true)
    try {
      await postAdminNodeGroupsByIdNodes({
        path: { id: group.id },
        body: { node_id: Number(selectedNodeId) },
      })
      toast.success("节点已添加")
      setSelectedNodeId("")
      invalidateNodeQueries()
      onChanged?.()
    } catch (err) {
      toast.error(getErrorMessage(err, "添加失败"))
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (nodeId: number) => {
    if (!group?.id) return
    try {
      await deleteAdminNodeGroupsByIdNodesByNodeId({
        path: { id: group.id, nodeId },
      })
      toast.success("节点已移除")
      invalidateNodeQueries()
      onChanged?.()
    } catch (err) {
      toast.error(getErrorMessage(err, "移除失败，节点上可能还有实例"))
    }
  }

  const statusBadge = (status: number | undefined) => {
    const s = status ?? 0
    const info = statusMap[s] ?? { label: "未知", variant: "secondary" as const }
    return <Badge variant={info.variant}>{info.label}</Badge>
  }

  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>节点管理 - {group?.name}</DialogTitle>
          <DialogDescription>管理节点组内的节点成员</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="搜索可用节点..."
                value={nodeSearch}
                onChange={(e) => { setNodeSearch(e.target.value); setAvailablePage(1); setSelectedNodeId("") }}
                className="pl-9"
              />
            </div>
            <Button onClick={handleAdd} disabled={!selectedNodeId || adding}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              添加
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {availableNodes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {keyword ? "未找到匹配的独立节点" : "没有可用的独立节点"}
              </p>
            ) : (
              availableNodes.map((n) => (
                <label
                  key={n.id}
                  className="flex items-center gap-3 rounded-md px-3 py-1.5 hover:bg-muted cursor-pointer"
                >
                  <input
                    type="radio"
                    name="available-node"
                    className="size-4"
                    checked={selectedNodeId === String(n.id)}
                    onChange={() => setSelectedNodeId(String(n.id!))}
                  />
                  <span className="text-sm truncate">{n.name} ({n.host})</span>
                </label>
              ))
            )}
          </div>

          <SimplePagination
            page={availablePage}
            pageSize={PAGE_SIZE}
            total={availableTotal}
            onChange={(p) => { setAvailablePage(p); setSelectedNodeId("") }}
          />
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : nodes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">暂无节点</p>
          ) : (
            nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-sm">{node.name}</div>
                    <div className="text-xs text-muted-foreground">{node.host}</div>
                  </div>
                  {statusBadge(node.status)}
                  {node.cluster_member_name && (
                    <Badge variant="outline" className="text-xs">
                      {node.cluster_member_name}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(node.id!)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
