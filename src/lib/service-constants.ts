// 用户端"我的服务"相关常量（界面文案统一称为"服务"）

const transitionalColor = "text-amber-600 dark:text-amber-400"
const transitionalDot = "bg-amber-500"

/** 服务状态展示配置（与云服务器状态指示器同一套配色） */
export const serviceStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "开通中", color: transitionalColor, dot: transitionalDot },
  active: { label: "运行中", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  suspended: { label: "已暂停", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  terminating: { label: "退订中", color: transitionalColor, dot: transitionalDot },
  terminated: { label: "已终止", color: "text-zinc-400 dark:text-zinc-500", dot: "bg-zinc-300 dark:bg-zinc-600" },
  cancelled: { label: "已取消", color: "text-zinc-400 dark:text-zinc-500", dot: "bg-zinc-300 dark:bg-zinc-600" },
}

export const unknownServiceStatus = { label: "未知", color: "text-zinc-400", dot: "bg-zinc-400" }

export type ServiceStatusFilter = "pending" | "active" | "suspended" | "terminating" | "terminated"

/** 服务列表状态筛选项 */
export const serviceStatusOptions: { value: "all" | ServiceStatusFilter; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "开通中" },
  { value: "active", label: "运行中" },
  { value: "suspended", label: "已暂停" },
  { value: "terminating", label: "退订中" },
  { value: "terminated", label: "已终止" },
]

/** 服务操作类型（非自定义操作时使用） */
export const serviceOperationTypeMap: Record<string, string> = {
  create: "开通",
  renew: "续费",
  suspend: "暂停",
  unsuspend: "恢复",
  terminate: "退订",
}

export type ServiceBillingCycle = "monthly" | "quarterly" | "yearly"

export const serviceBillingCycles: ServiceBillingCycle[] = ["monthly", "quarterly", "yearly"]
