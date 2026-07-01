import { useState } from "react"
import { postAdminInstancesByIdRetry } from "@/api"
import type { InstanceInstanceItem } from "@/api"
import { useTasks } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getErrorMessage } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RetryDialogProps {
  instance: InstanceInstanceItem | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function InstanceRetryDialog({ instance, onOpenChange, onSuccess }: RetryDialogProps) {
  const { addTask } = useTasks()
  const [submitting, setSubmitting] = useState(false)
  const [sourceAlias, setSourceAlias] = useState("")
  const [sourceServer, setSourceServer] = useState("")

  const open = instance !== null

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onOpenChange(false)
      return
    }
  }

  const handleOpen = () => {
    if (instance) {
      setSourceAlias(instance.source_alias ?? "")
      setSourceServer(instance.source_server ?? "")
    }
  }

  const handleSubmit = async () => {
    if (!instance) return
    setSubmitting(true)
    try {
      const body: Record<string, string> = {}
      if (sourceAlias !== (instance.source_alias ?? "")) body.source_alias = sourceAlias
      if (sourceServer !== (instance.source_server ?? "")) body.source_server = sourceServer

      const { data: res } = await postAdminInstancesByIdRetry({
        path: { id: instance.id! },
        body: Object.keys(body).length > 0 ? body : undefined,
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "重试失败")
        return
      }
      const data = res?.data as InstanceInstanceItem | undefined
      const taskId = data?.create_task_id
      if (taskId) {
        addTask(taskId, "create_instance")
        toast.success("创建任务已重新提交", { description: `任务 #${taskId} 正在后台执行` })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle>重试创建实例</DialogTitle>
          <DialogDescription>
            重新提交「{instance?.name}」的创建任务，可修改镜像源配置
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>镜像服务器</Label>
            <Input
              value={sourceServer}
              onChange={(e) => setSourceServer(e.target.value)}
              placeholder="留空使用默认"
            />
          </div>
          <div className="space-y-2">
            <Label>镜像别名</Label>
            <Input
              value={sourceAlias}
              onChange={(e) => setSourceAlias(e.target.value)}
              placeholder="ubuntu/24.04"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中..." : "重试创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
