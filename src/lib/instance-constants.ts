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

const transitionalColor = "text-amber-600 dark:text-amber-400"
const transitionalDot = "bg-amber-500"

export const portalStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  running: { label: "运行中", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  stopped: { label: "已停止", color: "text-zinc-400 dark:text-zinc-500", dot: "bg-zinc-300 dark:bg-zinc-600" },
  frozen: { label: "已冻结", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  error: { label: "异常", color: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  creating: { label: "创建中", color: transitionalColor, dot: transitionalDot },
  deleting: { label: "删除中", color: transitionalColor, dot: transitionalDot },
  rescue: { label: "救援模式", color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  starting: { label: "启动中", color: transitionalColor, dot: transitionalDot },
  stopping: { label: "停止中", color: transitionalColor, dot: transitionalDot },
  restarting: { label: "重启中", color: transitionalColor, dot: transitionalDot },
  reinstalling: { label: "重装中", color: transitionalColor, dot: transitionalDot },
  entering_rescue: { label: "进入救援中", color: transitionalColor, dot: transitionalDot },
  exiting_rescue: { label: "退出救援中", color: transitionalColor, dot: transitionalDot },
  upgrading: { label: "升级中", color: transitionalColor, dot: transitionalDot },
  migrating: { label: "迁移中", color: transitionalColor, dot: transitionalDot },
  snapshotting: { label: "快照中", color: transitionalColor, dot: transitionalDot },
  restoring_snapshot: { label: "恢复快照中", color: transitionalColor, dot: transitionalDot },
  resetting_password: { label: "重置密码中", color: transitionalColor, dot: transitionalDot },
  changing_ip: { label: "更换IP中", color: transitionalColor, dot: transitionalDot },
  freezing: { label: "冻结中", color: transitionalColor, dot: transitionalDot },
  unfreezing: { label: "解冻中", color: transitionalColor, dot: transitionalDot },
  deleting_snapshot: { label: "删除快照中", color: transitionalColor, dot: transitionalDot },
  adding_ip: { label: "添加IP中", color: transitionalColor, dot: transitionalDot },
  removing_ip: { label: "移除IP中", color: transitionalColor, dot: transitionalDot },
  mounting_iso: { label: "挂载ISO中", color: transitionalColor, dot: transitionalDot },
  unmounting_iso: { label: "卸载ISO中", color: transitionalColor, dot: transitionalDot },
  adding_nat_ip: { label: "添加NAT IP中", color: transitionalColor, dot: transitionalDot },
  removing_nat_ip: { label: "移除NAT IP中", color: transitionalColor, dot: transitionalDot },
  changing_nat_ip: { label: "更换NAT IP中", color: transitionalColor, dot: transitionalDot },
  throttling: { label: "限速中", color: transitionalColor, dot: transitionalDot },
  unthrottling: { label: "解除限速中", color: transitionalColor, dot: transitionalDot },
  syncing_firewall: { label: "同步防火墙中", color: transitionalColor, dot: transitionalDot },
  syncing_port_forward: { label: "同步端口转发中", color: transitionalColor, dot: transitionalDot },
}

const transitionalStatuses = new Set(
  Object.entries(portalStatusConfig)
    .filter(([, v]) => v.color === transitionalColor)
    .map(([k]) => k),
)

export function isTransitionalStatus(status: string): boolean {
  return transitionalStatuses.has(status)
}

export const statusFilterOptions = Object.entries(statusMap).map(([value, { label }]) => ({ label, value }))

export const typeFilterOptions = [
  { label: "虚拟机", value: "virtual-machine" },
  { label: "容器", value: "container" },
]
