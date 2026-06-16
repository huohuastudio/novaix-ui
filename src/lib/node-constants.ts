export const NODE_STATUS = { OFFLINE: 0, ONLINE: 1, DEPLOYING: 2, ERROR: 3, UNREACHABLE: 4, MAINTENANCE: 5 } as const

export const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  [NODE_STATUS.OFFLINE]: { label: "离线", variant: "secondary" },
  [NODE_STATUS.ONLINE]: { label: "在线", variant: "default" },
  [NODE_STATUS.DEPLOYING]: { label: "部署中", variant: "outline" },
  [NODE_STATUS.ERROR]: { label: "错误", variant: "destructive" },
  [NODE_STATUS.UNREACHABLE]: { label: "不可达", variant: "destructive" },
  [NODE_STATUS.MAINTENANCE]: { label: "维护中", variant: "outline" },
}

export const statusFilterOptions = Object.entries(statusMap).map(([value, { label }]) => ({ label, value }))
