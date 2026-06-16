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
