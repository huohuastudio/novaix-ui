export function formatAmount(cents: number | undefined, currencySymbol = "¥") {
  if (cents === undefined || cents === null) return "-"
  const abs = Math.abs(cents)
  const prefix = cents < 0 ? "-" : ""
  return `${prefix}${currencySymbol}${(abs / 100).toFixed(2)}`
}

export const orderStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待支付", variant: "outline" },
  paid: { label: "已支付", variant: "default" },
  cancelled: { label: "已取消", variant: "secondary" },
  refunded: { label: "已退款", variant: "destructive" },
}

export const orderTypeMap: Record<string, string> = {
  new: "新购",
  renew: "续费",
  upgrade: "升级",
  addon_ip: "附加 IP",
  traffic_package: "流量包",
}

export const billingCycleMap: Record<string, string> = {
  hourly: "时付",
  monthly: "月付",
  quarterly: "季付",
  yearly: "年付",
}

export const txTypeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  recharge: { label: "充值", variant: "default" },
  payment: { label: "支付", variant: "outline" },
  refund: { label: "退款", variant: "secondary" },
  admin: { label: "调账", variant: "destructive" },
  addon_ip: { label: "附加 IP", variant: "outline" },
  traffic_overage: { label: "流量超额", variant: "outline" },
  traffic_package: { label: "流量包", variant: "outline" },
  hourly_deduction: { label: "按时扣费", variant: "outline" },
  commission: { label: "返佣", variant: "default" },
  distribution: { label: "分销拿货", variant: "secondary" },
  change_ip: { label: "换 IP", variant: "outline" },
}

export const refundStatusMap: Record<string, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "退款审核中", color: "text-amber-600 dark:text-amber-400", variant: "outline" },
  approved: { label: "退款已通过", color: "text-emerald-600 dark:text-emerald-400", variant: "default" },
  rejected: { label: "退款已拒绝", color: "text-red-600 dark:text-red-400", variant: "destructive" },
}

export const planTypeMap: Record<string, string> = {
  vm: "云服务器",
  container: "容器",
}
