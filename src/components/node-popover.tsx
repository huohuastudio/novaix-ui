import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { getAdminNodesById } from "@/api"
import type { NodeNodeItem } from "@/api"
import { Skeleton } from "@/components/ui/skeleton"
import { statusMap } from "@/lib/node-constants"
import { formatMemory } from "@/lib/utils"
import { useLazyPopover } from "@/hooks/use-lazy-popover"

interface NodePopoverProps {
  nodeId?: number
  label?: string
}

export function NodePopover({ nodeId, label }: NodePopoverProps) {
  const { data: node, loading, handleOpen } = useLazyPopover<NodeNodeItem>(
    nodeId,
    (id) => getAdminNodesById({ path: { id } })
  )

  if (!nodeId) return <span className="text-muted-foreground">-</span>

  const displayLabel = label || `#${nodeId}`

  return (
    <Popover onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="text-primary hover:underline cursor-pointer">
          {displayLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {loading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : node ? (
          <div className="p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{node.name}</span>
              {node.status != null && statusMap[node.status] && (
                <Badge variant={statusMap[node.status].variant}>
                  {statusMap[node.status].label}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-[4rem_1fr] gap-y-1.5 text-muted-foreground">
              <span>ID</span>
              <span className="text-foreground font-mono text-xs">{node.id}</span>
              <span>地区</span>
              <span className="text-foreground">{node.region || "-"}</span>
              <span>架构</span>
              <span className="text-foreground">{node.arch || "-"}</span>
              <span>CPU</span>
              <span className="text-foreground">{node.cpu_used ?? 0} / {node.cpu_total ?? 0} 核</span>
              <span>内存</span>
              <span className="text-foreground">
                {formatMemory(node.mem_used ?? 0)} / {formatMemory(node.mem_total ?? 0)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">未找到节点信息</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
