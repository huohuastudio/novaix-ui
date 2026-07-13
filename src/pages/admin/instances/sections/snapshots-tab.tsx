import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Camera, Plus, History, Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  postAdminInstancesByIdSnapshots,
  postAdminInstancesByIdSnapshotsByNameRestore,
  deleteAdminInstancesByIdSnapshotsByName,
} from "@/api"
import type { ServiceSnapshotItem } from "@/api"
import { getAdminInstancesByIdSnapshotsOptions } from "@/api/@tanstack/react-query.gen"
import { getErrorMessage } from "@/lib/utils"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"
import { useTasks } from "@/hooks/use-tasks"
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
import { useFormatDate } from "@/hooks/use-site-settings"
export function SnapshotsTab({ instanceId }: { instanceId: number }) {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState("")
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { addTask } = useTasks()
  // instanceId 通过 path 进入 queryKey
  const snapshotsQuery = useQuery({
    ...getAdminInstancesByIdSnapshotsOptions({ path: { id: instanceId } }),
    select: (res) =>
      res?.code === 0 && res.data ? (res.data as ServiceSnapshotItem[]) : [],
  })
  const snapshots = snapshotsQuery.data ?? []
  const loading = snapshotsQuery.isPending
  // 保持原有行为：获取快照列表失败时提示错误
  useQueryErrorToast(snapshotsQuery.error, "获取快照列表失败")
  const handleCreate = async () => {
    if (!snapshotName.trim()) return
    setCreating(true)
    try {
      const { data: res } = await postAdminInstancesByIdSnapshots({
        path: { id: instanceId },
        body: { name: snapshotName.trim() },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "snapshot_create")
        toast.success("创建快照任务已提交")
        setCreateOpen(false)
        setSnapshotName("")
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
      const { data: res } = await postAdminInstancesByIdSnapshotsByNameRestore({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "snapshot_restore")
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
      const { data: res } = await deleteAdminInstancesByIdSnapshotsByName({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "snapshot_delete")
        toast.success("删除快照任务已提交")
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
    return <InstanceSnapshotsSkeleton />
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">快照管理</h3>
          <p className="text-sm text-muted-foreground mt-1">创建和管理实例的时间点快照</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          创建快照
        </Button>
      </div>
      {snapshots.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="暂无快照"
          description="快照可以保存实例当前状态，便于后续恢复"
        />
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div
              key={snap.name}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Camera className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{snap.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(snap.created_at)}
                    {snap.stateful && " · 包含运行状态"}
                    {snap.expires_at && ` · 过期: ${formatDate(snap.expires_at)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  disabled={actionLoading === snap.name}
                  onClick={() => setRestoreConfirm(snap.name!)}
                >
                  {actionLoading === snap.name ? (
                    <Spinner />
                  ) : (
                    <History className="size-4" />
                  )}
                  恢复
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={actionLoading === snap.name}
                  onClick={() => setDeleteConfirm(snap.name!)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
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
              确定要将实例恢复到快照 &ldquo;{restoreConfirm}&rdquo; 的状态吗？当前实例数据将被覆盖。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreConfirm && handleRestore(restoreConfirm)}
            >
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除快照</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除快照 &ldquo;{deleteConfirm}&rdquo; 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export function InstanceSnapshotsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40 mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="size-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
