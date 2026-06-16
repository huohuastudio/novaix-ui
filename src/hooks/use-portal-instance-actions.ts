import { useState, useCallback } from "react"
import {
  postPortalInstancesByIdStart,
  postPortalInstancesByIdStop,
  postPortalInstancesByIdRestart,
  postPortalInstancesByIdRescue,
  postPortalInstancesByIdUnrescue,
} from "@/api"
import type { PortalPortalInstanceItem } from "@/api"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

export type PortalPowerAction = "start" | "stop" | "restart" | "rescue" | "unrescue"

const actionConfig: Record<PortalPowerAction, {
  label: string
  fn: (opts: { path: { id: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  confirm?: { title: string; description: (name: string) => string }
}> = {
  start: {
    label: "启动",
    fn: postPortalInstancesByIdStart,
  },
  stop: {
    label: "停止",
    fn: postPortalInstancesByIdStop,
    confirm: {
      title: "停止云服务器",
      description: (name) => `确定要停止「${name}」吗？未保存的数据可能会丢失。`,
    },
  },
  restart: {
    label: "重启",
    fn: postPortalInstancesByIdRestart,
    confirm: {
      title: "重启云服务器",
      description: (name) => `确定要重启「${name}」吗？未保存的数据可能会丢失。`,
    },
  },
  rescue: {
    label: "救援模式",
    fn: postPortalInstancesByIdRescue,
    confirm: {
      title: "进入救援模式",
      description: (name) => `确定要将「${name}」切换到救援模式吗？系统将从救援镜像启动，你可以通过 VNC 控制台挂载原磁盘进行修复。`,
    },
  },
  unrescue: {
    label: "退出救援",
    fn: postPortalInstancesByIdUnrescue,
    confirm: {
      title: "退出救援模式",
      description: (name) => `确定要退出「${name}」的救援模式吗？系统将恢复正常启动。`,
    },
  },
}

export function usePortalInstanceActions(onRefresh: () => void) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const handlePowerAction = useCallback(async (
    instance: PortalPortalInstanceItem,
    action: PortalPowerAction,
  ) => {
    const cfg = actionConfig[action]

    if (cfg.confirm) {
      const ok = await confirm({
        title: cfg.confirm.title,
        description: cfg.confirm.description(instance.name ?? ""),
        confirmText: cfg.label,
      })
      if (!ok) return
    }

    setLoadingId(instance.id!)
    try {
      const { data: res } = await cfg.fn({ path: { id: instance.id! } })
      if (res?.code === 0) {
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
  }, [onRefresh, confirm])

  return { handlePowerAction, loadingId, ConfirmDialog }
}
