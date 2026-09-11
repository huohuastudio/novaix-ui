import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ArrowRightFromLine, Trash2, CheckCircle2, RefreshCw, Info, Camera } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getAdminNodesByIdRetireStatus,
  getAdminNodes,
  postAdminInstancesByIdMigrate,
  postAdminNodesByIdRetireMigrate,
  postAdminInstancesByIdSnapshots,
  deleteAdminInstancesById,
} from "@/api"
import type { ServiceRetireInstanceItem } from "@/api"
import { getAdminNodesQueryKey, getAdminNodesByIdRetireStatusQueryKey } from "@/api/@tanstack/react-query.gen"
import { getErrorMessage } from "@/lib/utils"
import { NODE_STATUS } from "@/lib/node-constants"
import { useTasks } from "@/hooks/use-tasks"
import { useConfirm } from "@/hooks/use-confirm"
import { onAdminTaskChange } from "@/hooks/use-admin-events"
import { Spinner } from "@/components/ui/spinner"

const retireStatusKey = (nodeId: number) => getAdminNodesByIdRetireStatusQueryKey({ path: { id: nodeId } })

interface Props {
  nodeId: number
}

function MigrateDialog({ instance, nodeId, needsSameGroup, retireMode, open, onOpenChange, onSuccess }: {
  instance: ServiceRetireInstanceItem
  nodeId: number
  needsSameGroup?: boolean
  retireMode?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [targetNodeId, setTargetNodeId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const { addTask } = useTasks()

  const nodesQuery = useQuery({
    queryKey: [...getAdminNodesQueryKey(), "migrate-targets", nodeId, needsSameGroup],
    queryFn: async () => {
      const { data: res } = await getAdminNodes({ query: { page: 1, page_size: 100, status: NODE_STATUS.ONLINE as 0 | 1 | 2 | 3 | 4 | 5 | 6 } })
      return (res?.data?.items ?? []).filter(n => n.id !== nodeId && n.status === NODE_STATUS.ONLINE)
    },
    enabled: open,
  })

  const handleMigrate = async () => {
    if (!targetNodeId) return
    setSubmitting(true)
    try {
      if (retireMode) {
        const { data: res } = await postAdminNodesByIdRetireMigrate({
          path: { id: nodeId },
          body: { instance_id: instance.id!, target_node_id: Number(targetNodeId) },
        })
        const taskId = res?.data?.task_id
        if (taskId) addTask(taskId, "retire_migrate_instance")
      } else {
        const { data: res } = await postAdminInstancesByIdMigrate({
          path: { id: instance.id! },
          body: { target_node_id: Number(targetNodeId) },
        })
        const taskId = res?.data?.task_id
        if (taskId) addTask(taskId, "migrate_instance")
      }
      toast.success(`实例「${instance.name}」迁移任务已提交`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "迁移失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{retireMode ? "退役迁移" : "迁移实例"}</DialogTitle>
          <DialogDescription>
            将实例「{instance.name}」迁移到其他在线节点。{retireMode ? "数据将复制到目标节点，网络资源将重新分配。" : "非集群迁移需要先停止实例。"}
          </DialogDescription>
        </DialogHeader>
        {retireMode && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 space-y-1">
            <p className="font-medium">退役迁移注意事项：</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>IP 地址将在目标节点重新分配，原 IP 不保留</li>
              <li>NAT 端口转发规则将在目标节点重建</li>
              <li>实例需要先停止才能迁移</li>
              <li>迁移失败时原实例和资源保持不变</li>
            </ul>
          </div>
        )}
        {needsSameGroup && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200 flex items-center gap-2">
            <Info className="size-3.5 shrink-0" />
            该实例挂载了 VPC 网络，目标节点必须在同一节点组内
          </div>
        )}
        <div className="space-y-3">
          <label className="text-sm font-medium">目标节点</label>
          <Select value={targetNodeId} onValueChange={setTargetNodeId}>
            <SelectTrigger>
              <SelectValue placeholder="选择目标节点" />
            </SelectTrigger>
            <SelectContent>
              {nodesQuery.data?.map(n => (
                <SelectItem key={n.id} value={String(n.id)}>
                  {n.name}（{n.host}）
                </SelectItem>
              ))}
              {nodesQuery.data?.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">没有可用的目标节点</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleMigrate} disabled={!targetNodeId || submitting}>
            {submitting && <Spinner className="mr-2" />}
            开始迁移
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SnapshotDialog({ instance, open, onOpenChange }: {
  instance: ServiceRetireInstanceItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { addTask } = useTasks()

  const handleSnapshot = async () => {
    const snapshotName = name.trim() || `retire-backup-${Date.now()}`
    setSubmitting(true)
    try {
      const { data: res } = await postAdminInstancesByIdSnapshots({
        path: { id: instance.id! },
        body: { name: snapshotName },
      })
      const taskId = (res?.data as { task_id?: number } | undefined)?.task_id
      if (taskId) addTask(taskId, "snapshot_create")
      toast.success(`快照「${snapshotName}」创建任务已提交`)
      onOpenChange(false)
      setName("")
    } catch (err) {
      toast.error(getErrorMessage(err, "创建快照失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建本地快照</DialogTitle>
          <DialogDescription>
            为实例「{instance.name}」创建本地快照，用于在当前实例上备份和恢复数据
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-sm font-medium">快照名称</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="留空自动生成"
          />
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200 space-y-1">
          <p className="font-medium">说明：</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>快照为原实例的本地备份，仅可在原实例上恢复，不支持跨节点恢复</li>
            <li>如需将数据迁移到其他节点，请使用退役迁移功能</li>
            <li>快照可用于操作前备份数据，以便出现问题时回滚</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSnapshot} disabled={submitting}>
            {submitting && <Spinner className="mr-2" />}
            创建快照
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function NodeRetirePanel({ nodeId }: Props) {
  const queryClient = useQueryClient()
  const [migrateTarget, setMigrateTarget] = useState<ServiceRetireInstanceItem | null>(null)
  const [migrateRetireMode, setMigrateRetireMode] = useState(false)
  const [snapshotTarget, setSnapshotTarget] = useState<ServiceRetireInstanceItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { addTask } = useTasks()
  const { confirm, ConfirmDialog } = useConfirm()

  const retireKey = retireStatusKey(nodeId)

  const query = useQuery({
    queryKey: retireKey,
    queryFn: async () => {
      const { data: res } = await getAdminNodesByIdRetireStatus({ path: { id: nodeId } })
      return res?.data
    },
  })

  // 监听任务完成事件，自动刷新退役面板
  useEffect(() => {
    return onAdminTaskChange((event) => {
      if (event.status === "completed" || event.status === "failed" || event.status === "compensation_failed") {
        if (event.type === "delete_instance" || event.type === "migrate_instance" || event.type === "live_migrate_instance" || event.type === "retire_migrate_instance" || event.type === "snapshot_create") {
          queryClient.invalidateQueries({ queryKey: retireKey })
        }
      }
    })
  }, [queryClient, retireKey])

  const handleDelete = async (instance: ServiceRetireInstanceItem) => {
    const ok = await confirm({
      title: "删除实例",
      description: `确定要删除实例「${instance.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    setDeletingId(instance.id!)
    try {
      const { data: res } = await deleteAdminInstancesById({ path: { id: instance.id! } })
      const taskId = (res?.data as { task_id?: number } | undefined)?.task_id
      if (taskId) {
        addTask(taskId, "delete_instance")
        toast.success(`实例「${instance.name}」删除任务已提交`)
      } else {
        toast.success(`实例「${instance.name}」已删除`)
        queryClient.invalidateQueries({ queryKey: retireKey })
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    } finally {
      setDeletingId(null)
    }
  }

  const handleMigrateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: retireKey })
  }

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-2">
        <p className="text-destructive font-medium">获取实例处置状态失败</p>
        <p className="text-muted-foreground text-xs">{getErrorMessage(query.error, "请检查网络连接后重试")}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          <RefreshCw className="size-3.5 mr-1" />
          重试
        </Button>
      </div>
    )
  }

  const data = query.data
  if (data && data.total_instances === 0) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200 flex items-center gap-2">
        <CheckCircle2 className="size-4 shrink-0" />
        该节点上没有实例，可以安全删除。
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 shrink-0" />
          该节点已停用，请处理以下 {data.total_instances} 个实例后再删除节点
        </div>
        <div className="flex gap-4 text-xs">
          {(data.migratable ?? 0) > 0 && <span>可迁移：{data.migratable} 个</span>}
          {(data.non_migratable ?? 0) > 0 && <span>需手动处理：{data.non_migratable} 个</span>}
        </div>
      </div>

      <div className="space-y-2">
        {data.instances?.map(inst => (
          <div key={inst.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{inst.name}</span>
                <Badge variant="outline" className="text-xs">{inst.status}</Badge>
                {inst.migratable
                  ? <Badge variant="default" className="text-xs">可迁移</Badge>
                  : <Badge variant="destructive" className="text-xs">需手动处理</Badge>
                }
                {inst.needs_same_group && (
                  <Badge variant="secondary" className="text-xs">需同组目标</Badge>
                )}
              </div>
              {!inst.migratable && inst.block_reasons && inst.block_reasons.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {inst.block_reasons.join("；")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMigrateTarget(inst); setMigrateRetireMode(!inst.migratable) }}
              >
                <ArrowRightFromLine className="size-3.5 mr-1" />
                {inst.migratable ? "迁移" : "退役迁移"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSnapshotTarget(inst)}
              >
                <Camera className="size-3.5 mr-1" />
                快照
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(inst)}
                disabled={deletingId === inst.id}
              >
                {deletingId === inst.id ? <Spinner className="size-3.5 mr-1" /> : <Trash2 className="size-3.5 mr-1" />}
                删除
              </Button>
            </div>
          </div>
        ))}
      </div>

      {migrateTarget && (
        <MigrateDialog
          instance={migrateTarget}
          nodeId={nodeId}
          needsSameGroup={migrateTarget.needs_same_group}
          retireMode={migrateRetireMode}
          open={!!migrateTarget}
          onOpenChange={(open) => !open && setMigrateTarget(null)}
          onSuccess={handleMigrateSuccess}
        />
      )}

      {snapshotTarget && (
        <SnapshotDialog
          instance={snapshotTarget}
          open={!!snapshotTarget}
          onOpenChange={(open) => !open && setSnapshotTarget(null)}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
