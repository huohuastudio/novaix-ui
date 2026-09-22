import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { postAdminInstancesByIdRebuild, type InstanceInstanceItem } from "@/api"
import { getAdminInstancesQueryKey, getAdminInstancesByIdQueryKey } from "@/api/@tanstack/react-query.gen"
import { useTasks } from "@/hooks/use-tasks"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getErrorMessage } from "@/lib/utils"

export function RebuildDialog({ instance, onClose }: { instance: InstanceInstanceItem; onClose: () => void }) {
  const [confirmName, setConfirmName] = useState("")
  const [deleteSnapshots, setDeleteSnapshots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const { addTask } = useTasks()

  async function submit() {
    if (!instance.id || confirmName !== instance.name || submitting) return
    setSubmitting(true)
    try {
      const { data: res } = await postAdminInstancesByIdRebuild({
        path: { id: instance.id },
        body: { confirm_name: confirmName, delete_snapshots: deleteSnapshots },
      })
      if (res?.code !== 0 || !res.data?.task_id) {
        toast.error(res?.message || "提交重建失败")
        return
      }
      addTask(res.data.task_id, "rebuild_instance")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getAdminInstancesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getAdminInstancesByIdQueryKey({ path: { id: instance.id } }) }),
      ])
      toast.success("重建任务已提交")
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, "提交重建失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>重建实例</DialogTitle>
          <DialogDescription>在原节点按已保存的配置重新创建系统，保留实例、订单、到期时间和资源分配。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-destructive">重建会清空系统盘，无法找回丢失的数据。附加磁盘需仍然存在；节点的网络、存储及镜像需可用。</p>
          <p className="text-sm text-muted-foreground">若上次重建在系统盘恢复后失败，再次提交将继续后续步骤，不会重复清空系统盘。</p>
          <div className="flex items-start gap-2">
            <Checkbox id="rebuild-snapshots" checked={deleteSnapshots} onCheckedChange={(v) => setDeleteSnapshots(v === true)} disabled={submitting} />
            <Label htmlFor="rebuild-snapshots" className="text-sm leading-5">同时删除原有快照及快照记录（不可恢复）</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rebuild-name">输入实例名称确认：<span className="break-all">{instance.name}</span></Label>
            <Input id="rebuild-name" autoComplete="off" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} disabled={submitting} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          <Button variant="destructive" disabled={submitting || !confirmName || confirmName !== instance.name} onClick={submit}>
            {submitting && <Spinner />}确认重建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
