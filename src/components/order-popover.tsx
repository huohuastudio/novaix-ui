import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { getAdminOrdersById } from "@/api"
import type { OrderOrderDetail } from "@/api"
import { Skeleton } from "@/components/ui/skeleton"
import { orderStatusMap, orderTypeMap, billingCycleMap } from "@/lib/order-constants"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { useLazyPopover } from "@/hooks/use-lazy-popover"

interface OrderPopoverProps {
  orderId?: number
  label?: string
}

export function OrderPopover({ orderId, label }: OrderPopoverProps) {
  const { data: order, loading, handleOpen } = useLazyPopover<OrderOrderDetail>(
    orderId,
    (id) => getAdminOrdersById({ path: { id } })
  )
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()

  if (!orderId) return <span className="text-muted-foreground">-</span>

  return (
    <Popover onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="font-mono text-xs text-primary hover:underline cursor-pointer">
          {label || `#${orderId}`}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {loading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : order ? (
          <div className="p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{order.order_no}</span>
              {order.status && orderStatusMap[order.status] && (
                <Badge variant={orderStatusMap[order.status].variant}>
                  {orderStatusMap[order.status].label}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-y-1.5 text-muted-foreground">
              <span>用户</span>
              <span className="text-foreground">{order.username || "-"}</span>
              <span>类型</span>
              <span className="text-foreground">{orderTypeMap[order.type ?? ""] ?? order.type ?? "-"}</span>
              <span>套餐</span>
              <span className="text-foreground truncate">{order.plan_name || "-"}</span>
              <span>周期</span>
              <span className="text-foreground">{billingCycleMap[order.billing_cycle ?? ""] ?? "-"}</span>
              <span>金额</span>
              <span className="text-foreground font-medium">{formatAmount(order.amount)}</span>
              <span>创建时间</span>
              <span className="text-foreground">{formatDate(order.created_at)}</span>
              {order.paid_at && order.paid_at !== "0001-01-01T00:00:00Z" && (
                <>
                  <span>支付时间</span>
                  <span className="text-foreground">{formatDate(order.paid_at)}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">未找到订单信息</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
