import { useState } from "react"
import { toast } from "sonner"
import { postAdminImagesByIdDistribute } from "@/api"
import type { ImageImageItem } from "@/api"
import { useTasks } from "@/hooks/use-tasks"
import NodeSelectDialog from "./node-select-dialog"

interface BatchDistributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: ImageImageItem[]
  onSuccess?: () => void
}

export default function BatchDistributeDialog({ open, onOpenChange, images, onSuccess }: BatchDistributeDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const { addTask } = useTasks()

  const handleSubmit = async (nodeIds: number[]) => {
    if (images.length === 0) return
    setSubmitting(true)

    // 第一轮：不强制，收集哪些成功、哪些冲突、哪些失败
    const succeeded: number[] = []
    const conflicted: ImageImageItem[] = []
    let failedCount = 0

    for (const image of images) {
      try {
        const { data: res } = await postAdminImagesByIdDistribute({
          path: { id: image.id! },
          body: { node_ids: nodeIds, force: false },
        })
        if (res?.code === 0) {
          const taskIds = res.data as number[]
          for (const tid of taskIds) addTask(tid, "distribute_image")
          succeeded.push(...taskIds)
        } else if (res?.code === 20406) {
          conflicted.push(image)
        } else {
          failedCount++
        }
      } catch {
        failedCount++
      }
    }

    setSubmitting(false)

    if (conflicted.length > 0) {
      const desc = succeeded.length > 0
        ? `${succeeded.length} 个任务已创建，${conflicted.length} 个镜像在目标节点已存在`
        : `${conflicted.length} 个镜像在目标节点已存在`
      toast(desc, {
        action: {
          label: "覆盖分发",
          onClick: () => void forceDistribute(conflicted, nodeIds),
        },
      })
      onOpenChange(false)
      if (succeeded.length > 0) onSuccess?.()
      return
    }

    onOpenChange(false)
    if (succeeded.length > 0) {
      toast.success(`已创建 ${succeeded.length} 个分发任务`, {
        description: failedCount > 0 ? `${failedCount} 个镜像分发失败` : "可在任务列表中查看进度",
      })
    } else {
      toast.error("所有镜像分发均失败")
    }
    onSuccess?.()
  }

  const forceDistribute = async (conflictImages: ImageImageItem[], nodeIds: number[]) => {
    setSubmitting(true)
    let totalTasks = 0
    let failedCount = 0

    try {
      for (const image of conflictImages) {
        try {
          const { data: res } = await postAdminImagesByIdDistribute({
            path: { id: image.id! },
            body: { node_ids: nodeIds, force: true },
          })
          if (res?.code === 0) {
            const taskIds = res.data as number[]
            for (const tid of taskIds) addTask(tid, "distribute_image")
            totalTasks += taskIds.length
          } else {
            failedCount++
          }
        } catch {
          failedCount++
        }
      }

      if (totalTasks > 0) {
        toast.success(`已创建 ${totalTasks} 个覆盖分发任务`, {
          description: failedCount > 0 ? `${failedCount} 个镜像分发失败` : "可在任务列表中查看进度",
        })
      } else {
        toast.error("覆盖分发均失败")
      }
    } finally {
      setSubmitting(false)
      onOpenChange(false)
      onSuccess?.()
    }
  }

  return (
    <NodeSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title="批量分发镜像到节点"
      description={`将 ${images.length} 个镜像分发到选中的节点`}
      submitLabel={(count) => `分发到 ${count} 个节点`}
      submitting={submitting}
      onSubmit={handleSubmit}
    />
  )
}
