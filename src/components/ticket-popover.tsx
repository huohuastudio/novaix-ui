import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getAdminTicketsById } from "@/api"
import type { TicketTicketDetailResponse } from "@/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useFormatDate } from "@/hooks/use-site-settings"
import { ticketStatusConfig, priorityLabels } from "@/lib/ticket-constants"
import { useLazyPopover } from "@/hooks/use-lazy-popover"

interface TicketPopoverProps {
  ticketId?: number
  label?: string
}

export function TicketPopover({ ticketId, label }: TicketPopoverProps) {
  const { data: ticket, loading, handleOpen } = useLazyPopover<TicketTicketDetailResponse>(
    ticketId,
    (id) => getAdminTicketsById({ path: { id } })
  )
  const formatDate = useFormatDate()

  if (!ticketId) return <span className="text-muted-foreground">-</span>

  const displayLabel = label || `#${ticketId}`

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
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : ticket ? (
          <div className="p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{ticket.subject}</span>
              {ticket.status && ticketStatusConfig[ticket.status] && (
                <span className={`shrink-0 text-xs font-medium ${ticketStatusConfig[ticket.status].text}`}>
                  {ticketStatusConfig[ticket.status].label}
                </span>
              )}
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-y-1.5 text-muted-foreground">
              <span>提交用户</span>
              <span className="text-foreground">{ticket.username || "-"}</span>
              <span>优先级</span>
              <span className="text-foreground">{priorityLabels[ticket.priority ?? 0] ?? "-"}</span>
              <span>回复数</span>
              <span className="text-foreground">{ticket.replies?.length ?? 0}</span>
              <span>创建时间</span>
              <span className="text-foreground">{formatDate(ticket.created_at)}</span>
              {ticket.last_reply_at && (
                <>
                  <span>最后回复</span>
                  <span className="text-foreground">{formatDate(ticket.last_reply_at)}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">未找到工单信息</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
