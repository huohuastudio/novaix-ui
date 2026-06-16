import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@uidotdev/usehooks"
import {
  getAdminNodeGroupsByIdNodes,
  postAdminNodeGroupsByIdNodes,
  deleteAdminNodeGroupsByIdNodesByNodeId,
  getAdminNodes,
} from "@/api"
import type { NodeGroupNodeInGroupItem, NodeNodeItem } from "@/api"
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
  const [nodes, setNodes] = useState<NodeGroupNodeInGroupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [availableNodes, setAvailableNodes] = useState<NodeNodeItem[]>([])
  const [availableTotal, setAvailableTotal] = useState(0)
  const [availablePage, setAvailablePage] = useState(1)
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")
  const [adding, setAdding] = useState(false)
  const [nodeSearch, setNodeSearch] = useState("")
  const keyword = useDebounce(nodeSearch, 300)
  const fetchIdRef = useRef(0)

  const fetchNodes = useCallback(async () => {
    if (!group?.id) return
    setLoading(true)
    try {
      const { data: res } = await getAdminNodeGroupsByIdNodes({ path: { id: group.id } })
      setNodes((res?.data as NodeGroupNodeInGroupItem[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [group?.id])

  const fetchAvailableNodes = useCallback(async (p: number, kw: string) => {
    const id = ++fetchIdRef.current
    try {
      const { data: res } = await getAdminNodes({
        query: { page: p, page_size: PAGE_SIZE, ungrouped: true, keyword: kw || undefined },
      })
      if (id !== fetchIdRef.current) return
      const items = res?.data?.items ?? []
      const total = res?.data?.total ?? 0
      if (items.length === 0 && p > 1 && total > 0) {
        const lastPage = Math.ceil(total / PAGE_SIZE)
        setAvailablePage(Math.max(1, lastPage))
        return
      }
      setAvailableNodes(items)
      setAvailableTotal(total)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (group?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
      fetchNodes()
      setNodeSearch("")
      setSelectedNodeId("")
      setAvailablePage(1)
    }
  }, [group?.id, fetchNodes])

  useEffect(() => {
    if (!group?.id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keyword 变化时获取数据
    fetchAvailableNodes(availablePage, keyword)
  }, [group?.id, availablePage, keyword, fetchAvailableNodes])

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
      fetchNodes()
      fetchAvailableNodes(availablePage, keyword)
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
      fetchNodes()
      fetchAvailableNodes(availablePage, keyword)
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
