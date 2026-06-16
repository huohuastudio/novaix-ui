import { useState, useCallback } from "react"
import {
  deleteAdminInstancesById,
  postAdminInstancesByIdStart,
  postAdminInstancesByIdStop,
  postAdminInstancesByIdRestart,
  postAdminInstancesByIdFreeze,
  postAdminInstancesByIdUnfreeze,
  postAdminInstancesByIdForceStop,
  postAdminInstancesByIdRescue,
  postAdminInstancesByIdUnrescue,
} from "@/api"
import type { InstanceInstanceItem } from "@/api"
import { useConfirm } from "@/hooks/use-confirm"
import { useTasks } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

export type PowerAction = "start" | "stop" | "restart" | "freeze" | "unfreeze" | "force-stop" | "rescue" | "unrescue"

const ACTION_TASK_TYPES: Record<PowerAction, string> = {
  start: "start_instance",
  stop: "stop_instance",
  restart: "restart_instance",
  freeze: "freeze_instance",
  unfreeze: "unfreeze_instance",
  "force-stop": "force_stop_instance",
  rescue: "rescue_instance",
  unrescue: "unrescue_instance",
}

const actionConfig: Record<PowerAction, {
  label: string
  fn: (opts: { path: { id: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  confirm?: { title: string; description: (name: string) => string; destructive?: boolean }
}> = {
  start: {
    label: "启动",
    fn: postAdminInstancesByIdStart,
  },
  stop: {
    label: "停止",
    fn: postAdminInstancesByIdStop,
    confirm: {
      title: "停止实例",
      description: (name) => `确定要停止实例「${name}」吗？实例中未保存的数据可能会丢失。`,
    },
  },
  restart: {
    label: "重启",
    fn: postAdminInstancesByIdRestart,
    confirm: {
      title: "重启实例",
      description: (name) => `确定要重启实例「${name}」吗？实例中未保存的数据可能会丢失。`,
    },
  },
  freeze: {
    label: "冻结",
    fn: postAdminInstancesByIdFreeze,
    confirm: {
      title: "冻结实例",
      description: (name) => `确定要冻结实例「${name}」吗？所有进程将被暂停。`,
    },
  },
  unfreeze: {
    label: "解冻",
    fn: postAdminInstancesByIdUnfreeze,
  },
  "force-stop": {
    label: "强制停止",
    fn: postAdminInstancesByIdForceStop,
    confirm: {
      title: "强制停止实例",
      description: (name) => `确定要强制停止实例「${name}」吗？这可能导致数据损坏。`,
      destructive: true,
    },
  },
  rescue: {
    label: "救援模式",
    fn: postAdminInstancesByIdRescue,
    confirm: {
      title: "进入救援模式",
      description: (name) => `确定要将实例「${name}」切换到救援模式吗？实例将从救援 ISO 启动，原系统磁盘可通过控制台手动挂载修复。`,
    },
  },
  unrescue: {
    label: "退出救援",
    fn: postAdminInstancesByIdUnrescue,
    confirm: {
      title: "退出救援模式",
      description: (name) => `确定要退出实例「${name}」的救援模式吗？实例将恢复正常启动。`,
    },
  },
}

export function useInstanceActions(onRefresh: () => void) {
  const { confirm, ConfirmDialog } = useConfirm()
  const { addTask } = useTasks()
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const handleDelete = useCallback(async (instance: InstanceInstanceItem): Promise<boolean> => {
    const ok = await confirm({
      title: "删除实例",
      description: `确定要删除实例「${instance.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return false
    try {
      const { data: res } = await deleteAdminInstancesById({ path: { id: instance.id! } })
      if (res?.code !== 0) {
        toast.error((res as { message?: string })?.message ?? "删除失败")
        return false
      }
      onRefresh()
      return true
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
      return false
    }
  }, [onRefresh, confirm])

  const handlePowerAction = useCallback(async (
    instance: InstanceInstanceItem,
    action: PowerAction,
  ) => {
    const cfg = actionConfig[action]

    if (cfg.confirm) {
      const ok = await confirm({
        title: cfg.confirm.title,
        description: cfg.confirm.description(instance.name ?? ""),
        confirmText: cfg.label,
        destructive: cfg.confirm.destructive,
      })
      if (!ok) return
    }

    setLoadingId(instance.id!)
    try {
      const { data: res } = await cfg.fn({ path: { id: instance.id! } })
      if (res?.code === 0) {
        const taskId = (res.data as { task_id?: number })?.task_id
        if (taskId) {
          addTask(taskId, ACTION_TASK_TYPES[action])
        }
        toast.success(`${cfg.label}任务已提交`)
        onRefresh()
      } else {
        toast.error((res as { message?: string })?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setLoadingId(null)
    }
  }, [onRefresh, confirm, addTask])

  return { handleDelete, handlePowerAction, loadingId, ConfirmDialog }
}
