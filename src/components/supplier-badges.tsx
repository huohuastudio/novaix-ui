import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { moduleOpStatusMap, moduleServiceStatusMap, suspendReasonMap } from "@/lib/supplier-constants"

/** 模块服务状态徽章：开通中 / 退订中等过渡状态带加载指示，暂停时悬停显示原因 */
export function ModuleServiceStatusBadge({ status, reason, busy }: { status?: string; reason?: string; busy?: boolean }) {
  const s = moduleServiceStatusMap[status ?? ""] ?? { label: status || "未知", variant: "outline" as const }
  const transitional = status === "pending" || status === "terminating"
  return (
    <Badge variant={s.variant} title={status === "suspended" && reason ? suspendReasonMap[reason] ?? reason : undefined}>
      {(transitional || busy) && <Spinner size="sm" />}
      {s.label}
    </Badge>
  )
}

/** 供应商操作状态徽章 */
export function ModuleOpStatusBadge({ status }: { status?: string }) {
  const s = moduleOpStatusMap[status ?? ""]
  return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="outline">{status || "-"}</Badge>
}
