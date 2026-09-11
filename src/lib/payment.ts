import type { PortalPaymentMethodItem } from "@/api"

export const paymentStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待支付", variant: "secondary" },
  paid: { label: "已支付", variant: "default" },
  failed: { label: "失败", variant: "destructive" },
  expired: { label: "已过期", variant: "outline" },
  cancelled: { label: "已取消", variant: "outline" },
}

export function methodKey(m: PortalPaymentMethodItem): string {
  return m.method ? `${m.provider}:${m.method}` : m.provider ?? ""
}

// percent 模式下 fee_amount 为千分比（‰），如 6 = 0.6%，29 = 2.9%，30 = 3%
export function calculateFee(method: PortalPaymentMethodItem | undefined, baseAmount: number): number {
  if (!method || !method.fee_type || method.fee_type === "none") return 0
  const feeAmount = method.fee_amount ?? 0
  if (feeAmount <= 0 || baseAmount <= 0) return 0
  if (method.fee_type === "fixed") return feeAmount
  if (method.fee_type === "percent") {
    if (feeAmount > 1000) return 0
    return Math.floor(baseAmount * feeAmount / 1000)
  }
  return 0
}

export function renderAmountWithFee(amount: number, feeAmount: number, formatAmount: (v: number) => string): { text: string; title?: string } {
  if (feeAmount > 0) {
    return { text: formatAmount(amount), title: `含手续费 ${formatAmount(feeAmount)}` }
  }
  return { text: formatAmount(amount) }
}

export function formatFeePercent(permille: number): string {
  const pct = permille / 10
  return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`
}
