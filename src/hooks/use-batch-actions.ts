import { useState, useCallback } from "react"
import { postAdminInstancesBatchAction } from "@/api"
import type { InstanceBatchActionResponse } from "@/api"
import { useConfirm } from "@/hooks/use-confirm"
import { useTasks } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

export type BatchAction = "start" | "stop" | "restart" | "freeze" | "unfreeze" | "force-stop" | "delete"

const ACTION_LABELS: Record<BatchAction, string> = {
  start: "启动",
  stop: "停止",
  restart: "重启",
  freeze: "冻结",
  unfreeze: "解冻",
  "force-stop": "强制停止",
  delete: "删除",
}

const ACTION_CONFIRM: Partial<Record<BatchAction, { destructive?: boolean; warning?: string }>> = {
  stop: { warning: "实例中未保存的数据可能会丢失" },
  restart: { warning: "实例中未保存的数据可能会丢失" },
  freeze: { warning: "所有进程将被暂停" },
  "force-stop": { destructive: true, warning: "这可能导致数据损坏" },
  delete: { destructive: true, warning: "此操作不可撤销" },
}

const BATCH_TASK_TYPES: Partial<Record<BatchAction, string>> = {
  start: "start_instance",
  stop: "stop_instance",
  restart: "restart_instance",
  freeze: "freeze_instance",
  unfreeze: "unfreeze_instance",
  "force-stop": "force_stop_instance",
  delete: "delete_instance",
}

export function useBatchActions(onSuccess: () => void) {
  const { confirm, ConfirmDialog } = useConfirm()
  const { addTasks } = useTasks()
  const [loading, setLoading] = useState(false)

  const handleBatchAction = useCallback(async (ids: number[], action: BatchAction) => {
    const label = ACTION_LABELS[action]
    const cfg = ACTION_CONFIRM[action]

    const description = cfg
      ? `确定要批量${label} ${ids.length} 个实例吗？${cfg.warning}`
      : `确定要批量${label} ${ids.length} 个实例吗？`

    const ok = await confirm({
      title: `批量${label}`,
      description,
      confirmText: label,
      destructive: cfg?.destructive,
    })
    if (!ok) return

    setLoading(true)
    try {
      const { data: res } = await postAdminInstancesBatchAction({
        body: { ids, action },
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "操作失败")
        return
      }
      const result = res.data as InstanceBatchActionResponse
      const taskType = BATCH_TASK_TYPES[action]
      if (taskType && result.results) {
        const taskItems = result.results
          .filter((item) => item.success && item.task_id)
          .map((item) => ({ id: item.task_id!, type: taskType }))
        addTasks(taskItems)
      }
      if (result.failed === 0) {
        toast.success(`批量${label}完成，共 ${result.total} 个实例`)
      } else if (result.success === 0) {
        toast.error(`批量${label}失败，${result.failed} 个实例操作失败`)
      } else {
        toast.warning(`批量${label}：${result.success} 个成功，${result.failed} 个失败`)
      }
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setLoading(false)
    }
  }, [confirm, addTasks, onSuccess])

  return { handleBatchAction, loading, ConfirmDialog }
}
