import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { getAdminInstancesById } from "@/api"
import type { InstanceInstanceItem } from "@/api"
import { Skeleton } from "@/components/ui/skeleton"
import { statusMap } from "@/lib/instance-constants"
import { useFormatDate } from "@/hooks/use-site-settings"
import { billingCycleMap } from "@/lib/order-constants"
import { useLazyPopover } from "@/hooks/use-lazy-popover"

interface InstancePopoverProps {
  instanceId?: number
  label?: string
}

export function InstancePopover({ instanceId, label }: InstancePopoverProps) {
  const { data: instance, loading, handleOpen } = useLazyPopover<InstanceInstanceItem>(
    instanceId,
    (id) => getAdminInstancesById({ path: { id } })
  )
  const formatDate = useFormatDate()

  if (!instanceId) return <span className="text-muted-foreground">-</span>

  const displayLabel = label || `#${instanceId}`

  return (
    <Popover onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="text-primary hover:underline cursor-pointer">
          {displayLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {loading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : instance ? (
          <div className="p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{instance.name}</span>
              {instance.status && statusMap[instance.status] && (
                <Badge variant={statusMap[instance.status].variant}>
                  {statusMap[instance.status].label}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-y-1.5 text-muted-foreground">
              <span>IP</span>
              <span className="text-foreground font-mono text-xs">{instance.ip_address || "-"}</span>
              <span>配置</span>
              <span className="text-foreground text-xs">
                {instance.cpu}C / {(instance.memory ?? 0) >= 1024 ? `${((instance.memory ?? 0) / 1024).toFixed(0)}G` : `${instance.memory}M`} / {instance.disk}G
              </span>
              <span>节点</span>
              <span className="text-foreground">{instance.node_name || "-"}</span>
              <span>计费周期</span>
              <span className="text-foreground">{billingCycleMap[instance.billing_cycle ?? ""] ?? "-"}</span>
              <span>到期时间</span>
              <span className="text-foreground">{formatDate(instance.expire_at)}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">未找到实例信息</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
