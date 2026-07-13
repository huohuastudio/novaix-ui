import { useMemo, useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera, Plus, History, Trash2, Clock } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  postPortalInstancesByIdSnapshots,
  postPortalInstancesByIdSnapshotsByNameRestore,
  deletePortalInstancesByIdSnapshotsByName,
  postPortalInstancesByIdAutoBackup,
} from "@/api"
import {
  getPortalBackupPolicyOptions,
  getPortalInstancesByIdSnapshotsOptions,
  getPortalInstancesByIdSnapshotsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import type { ServiceSnapshotItem } from "@/api"
import { getErrorMessage } from "@/lib/utils"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"
import { usePortalTasks } from "@/hooks/use-portal-tasks"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useFormatDate } from "@/hooks/use-site-settings"

export function SnapshotsTab({ instanceId, instanceBusy, autoBackup, lastBackupAt, onAutoBackupChange }: {
  instanceId: number
  instanceBusy: boolean
  autoBackup?: boolean
  lastBackupAt?: string
  onAutoBackupChange: (enabled: boolean) => void
}) {
  const formatDate = useFormatDate()
  const { addTask } = usePortalTasks()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState("")
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  const policyQuery = useQuery(getPortalBackupPolicyOptions())
  const policyRes = policyQuery.data
  const backupPolicy = policyRes?.code === 0 ? policyRes.data ?? null : null
  const policyLoaded = !policyQuery.isPending
  const policyError = policyQuery.isError || (policyRes != null && !(policyRes.code === 0 && policyRes.data))

  const autoBackupDesc = () => {
    if (!policyLoaded) return "加载中..."
    if (policyError) return "自动备份策略加载失败"
    if (backupPolicy?.enabled !== true) return "管理员尚未启用自动备份功能"
    if (autoBackup && lastBackupAt) return `上次备份: ${formatDate(lastBackupAt)}`
    return "系统按策略自动创建快照"
  }

  const handleToggleAutoBackup = async (checked: boolean) => {
    setToggling(true)
    try {
      const { data: res } = await postPortalInstancesByIdAutoBackup({
        path: { id: instanceId },
        body: { enabled: checked },
      })
      if (res?.code === 0) {
        toast.success(checked ? "已开启自动备份" : "已关闭自动备份")
        onAutoBackupChange(checked)
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setToggling(false)
    }
  }

  const snapshotsQuery = useQuery(getPortalInstancesByIdSnapshotsOptions({ path: { id: instanceId } }))
  const snapshots = useMemo<ServiceSnapshotItem[]>(() => {
    const res = snapshotsQuery.data
    return res?.code === 0 && res.data ? (res.data as ServiceSnapshotItem[]) : []
  }, [snapshotsQuery.data])
  const loading = snapshotsQuery.isPending

  // 快照列表加载失败时提示（与原手动取数的 toast 行为一致）
  useQueryErrorToast(snapshotsQuery.error, "获取快照列表失败")

  const refreshSnapshots = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getPortalInstancesByIdSnapshotsQueryKey({ path: { id: instanceId } }) })
  }, [queryClient, instanceId])

  const handleCreate = async () => {
    if (!snapshotName.trim()) return
    setCreating(true)
    try {
      const { data: res } = await postPortalInstancesByIdSnapshots({
        path: { id: instanceId },
        body: { name: snapshotName.trim() },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "snapshot_create", instanceId)
        toast.success("创建快照任务已提交")
        setCreateOpen(false)
        setSnapshotName("")
        setTimeout(refreshSnapshots, 2000)
      } else {
        toast.error(res?.message || "创建快照失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建快照失败"))
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (name: string) => {
    setRestoreConfirm(null)
    setActionLoading(name)
    try {
      const { data: res } = await postPortalInstancesByIdSnapshotsByNameRestore({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "snapshot_restore", instanceId)
        toast.success("恢复快照任务已提交")
      } else {
        toast.error(res?.message || "恢复快照失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "恢复快照失败"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (name: string) => {
    setDeleteConfirm(null)
    setActionLoading(name)
    try {
      const { data: res } = await deletePortalInstancesByIdSnapshotsByName({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "snapshot_delete", instanceId)
        toast.success("删除快照任务已提交")
        setTimeout(refreshSnapshots, 2000)
      } else {
        toast.error(res?.message || "删除快照失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除快照失败"))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40 mt-1.5" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="rounded-2xl bg-background px-5 py-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="size-4 text-muted-foreground" />
              <div>
                <div className="text-[13px] font-medium">自动备份</div>
                <div className="text-[12px] text-muted-foreground">
                  {autoBackupDesc()}
                </div>
              </div>
            </div>
            <Switch
              checked={autoBackup ?? false}
              onCheckedChange={handleToggleAutoBackup}
              disabled={toggling || !policyLoaded || (backupPolicy?.enabled !== true && !autoBackup)}
            />
          </div>
          {backupPolicy && backupPolicy.enabled && (
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-4 text-[12px]">
              <div>
                <span className="text-muted-foreground">执行频率</span>
                <p className="font-medium mt-0.5">{backupPolicy.frequency === "weekly" ? "每周一次" : "每天一次"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">执行时间</span>
                <p className="font-medium mt-0.5">{String(backupPolicy.hour ?? 3).padStart(2, "0")}:00</p>
              </div>
              <div>
                <span className="text-muted-foreground">保留数量</span>
                <p className="font-medium mt-0.5">最近 {backupPolicy.retention ?? 3} 份</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">快照管理</h2>
          <Button onClick={() => setCreateOpen(true)} disabled={instanceBusy}>
            <Plus className="size-3.5" />
            创建快照
          </Button>
        </div>

        {snapshots.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="暂无快照"
            description="快照可以保存当前状态，便于后续恢复"
          />
        ) : (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {snapshots.map((snap) => (
              <div key={snap.name} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-[13px] font-medium">{snap.name}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {formatDate(snap.created_at)}
                    {snap.stateful && " · 包含运行状态"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={instanceBusy || actionLoading === snap.name}
                    onClick={() => setRestoreConfirm(snap.name!)}
                  >
                    {actionLoading === snap.name ? <Spinner /> : <History className="size-3.5" />}
                    恢复
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={instanceBusy || actionLoading === snap.name}
                    onClick={() => setDeleteConfirm(snap.name!)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建快照</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="输入快照名称"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating || !snapshotName.trim()}>
              {creating && <Spinner />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={restoreConfirm !== null} onOpenChange={(open) => { if (!open) setRestoreConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复快照</AlertDialogTitle>
            <AlertDialogDescription>
              确定要恢复到快照「{restoreConfirm}」的状态吗？当前数据将被覆盖。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreConfirm && handleRestore(restoreConfirm)}>确认恢复</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除快照</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除快照「{deleteConfirm}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
