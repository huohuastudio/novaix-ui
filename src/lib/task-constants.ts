// 任务类型与状态的统一文案映射，供任务面板、任务大屏等复用

export const TASK_TYPE_LABELS: Record<string, string> = {
  create_instance: "创建实例",
  delete_instance: "删除实例",
  reinstall_instance: "重装实例",
  start_instance: "启动实例",
  stop_instance: "停止实例",
  restart_instance: "重启实例",
  freeze_instance: "冻结实例",
  unfreeze_instance: "解冻实例",
  force_stop_instance: "强制停止实例",
  provision_instance: "配置实例",
  upgrade_instance: "升级实例",
  throttle_instance: "限速实例",
  unthrottle_instance: "解除限速",
  change_ip: "更换 IP",
  add_ip: "添加 IP",
  remove_ip: "移除 IP",
  reset_password: "重置密码",
  init_node: "初始化节点",
  sync_node: "同步节点",
  sync_firewall: "同步防火墙",
  sync_port_forward: "同步端口转发",
  sync_nat_forward: "同步 NAT 转发",
  distribute_image: "分发镜像",
  download_image: "下载镜像",
  pull_node_image: "拉取镜像",
  snapshot_create: "创建快照",
  snapshot_restore: "恢复快照",
  snapshot_delete: "删除快照",
  mount_iso: "挂载 ISO",
  unmount_iso: "卸载 ISO",
  system_update: "系统更新",
  migrate_instance: "迁移实例",
  live_migrate_instance: "在线迁移实例",
  rescue_instance: "进入救援",
  unrescue_instance: "退出救援",
  evacuate_node: "疏散节点",
}

export function taskTypeLabel(type: string) {
  return TASK_TYPE_LABELS[type] ?? type
}

// 任务类型下拉选项
export const taskTypeOptions = Object.entries(TASK_TYPE_LABELS).map(
  ([value, label]) => ({ label, value }),
)

export type TaskStatus = "pending" | "running" | "completed" | "failed"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

export const taskStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "等待中", variant: "outline" },
  running: { label: "运行中", variant: "default" },
  completed: { label: "已完成", variant: "secondary" },
  failed: { label: "失败", variant: "destructive" },
}

export function taskStatusLabel(status: string) {
  return taskStatusMap[status]?.label ?? status
}

// 状态筛选下拉选项
export const taskStatusOptions = Object.entries(taskStatusMap).map(
  ([value, { label }]) => ({ label, value }),
)
