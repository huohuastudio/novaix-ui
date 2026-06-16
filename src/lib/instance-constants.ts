export const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  stopped: { label: "已停止", variant: "secondary" },
  running: { label: "运行中", variant: "default" },
  frozen: { label: "已冻结", variant: "outline" },
  error: { label: "错误", variant: "destructive" },
  creating: { label: "创建中", variant: "outline" },
  deleting: { label: "删除中", variant: "destructive" },
  suspending: { label: "暂停中", variant: "outline" },
  rescue: { label: "救援模式", variant: "destructive" },
}

export const portalStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  running: { label: "运行中", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  stopped: { label: "已停止", color: "text-zinc-400 dark:text-zinc-500", dot: "bg-zinc-300 dark:bg-zinc-600" },
  frozen: { label: "已冻结", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  error: { label: "异常", color: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  creating: { label: "创建中", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  rescue: { label: "救援模式", color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
}

export const statusFilterOptions = Object.entries(statusMap).map(([value, { label }]) => ({ label, value }))

export const typeFilterOptions = [
  { label: "虚拟机", value: "virtual-machine" },
  { label: "容器", value: "container" },
]
