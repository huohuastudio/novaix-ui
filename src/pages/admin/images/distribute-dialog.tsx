import { useState } from "react"
import { toast } from "sonner"
import { postAdminImagesByIdDistribute } from "@/api"
import type { ImageImageItem } from "@/api"
import { useTasks } from "@/hooks/use-tasks"
import { getErrorMessage } from "@/lib/utils"
import NodeSelectDialog from "./node-select-dialog"

interface DistributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageImageItem | null
}

export default function DistributeDialog({ open, onOpenChange, image }: DistributeDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const { addTask } = useTasks()

  const submitDistribute = async (nodeIds: number[], force: boolean) => {
    if (!image) return
    setSubmitting(true)
    try {
      const { data: res } = await postAdminImagesByIdDistribute({
        path: { id: image.id! },
        body: { node_ids: nodeIds, force },
      })
      if (res?.code === 0) {
        const taskIds = res.data as number[]
        for (const tid of taskIds) addTask(tid, "distribute_image")
        toast.success(`已创建 ${taskIds.length} 个分发任务`, {
          description: "可在任务列表中查看进度",
        })
        onOpenChange(false)
      } else if (res?.code === 20406 && !force) {
        toast("目标节点上已存在该镜像", {
          action: { label: "覆盖分发", onClick: () => void submitDistribute(nodeIds, true) },
        })
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
    <NodeSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title="分发镜像到节点"
      description={`将镜像「${image?.name ?? ""}」分发到选中的节点`}
      submitLabel={(count) => `分发到 ${count} 个节点`}
      submitting={submitting}
      onSubmit={(nodeIds) => submitDistribute(nodeIds, false)}
    />
  )
}
