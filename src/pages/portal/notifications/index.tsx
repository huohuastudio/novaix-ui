import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { Bell, CheckCheck, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SimplePagination } from '@/components/simple-pagination'
import { useSiteSettings, useFormatDate } from '@/hooks/use-site-settings'
import {
  getPortalNotifications,
  putPortalNotificationsByIdRead,
  putPortalNotificationsReadAll,
} from '@/api'
import type { PortalNotificationItem } from '@/api'

const typeLabels: Record<string, string> = {
  expiry_warning: '到期提醒',
  traffic_warning: '流量告警',
  traffic_throttled: '限速通知',
  traffic_charged: '流量扣费',
  traffic_suspended: '流量暂停',
  renew_success: '续费成功',
  renew_failed: '续费失败',
  ticket_reply: '工单回复',
  commission: '返佣通知',
  refund_approved: '退款通过',
  refund_rejected: '退款拒绝',
  balance_adjusted: '余额变动',
  instance_frozen: '实例暂停',
  instance_deleted: '实例回收',
  system: '系统通知',
}

export default function NotificationsPage() {
  const { site_name: siteName } = useSiteSettings()
  useDocumentTitle(`通知 - ${siteName}`)
  const formatDate = useFormatDate()
  const navigate = useNavigate()

  const [items, setItems] = useState<PortalNotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const fetchNotifications = useCallback(async (p: number, unread: boolean) => {
    try {
      const { data: res } = await getPortalNotifications({
        query: { page: p, page_size: pageSize, unread_only: unread },
      })
      if (res?.code === 0) {
        setItems((res.data as { items: PortalNotificationItem[] })?.items ?? [])
        setTotal((res.data as { total: number })?.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(page, unreadOnly)
  }, [fetchNotifications, page, unreadOnly])

  const handleMarkRead = async (id: number) => {
    await putPortalNotificationsByIdRead({ path: { id } })
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleMarkAllRead = async () => {
    await putPortalNotificationsReadAll()
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleClick = (notif: PortalNotificationItem) => {
    if (!notif.is_read) handleMarkRead(notif.id!)
    if (notif.rel_type === 'instance' && notif.rel_id) {
      navigate(`/portal/servers/${notif.rel_id}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">通知</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看系统消息和提醒</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? "secondary" : "ghost"}
            onClick={() => { setUnreadOnly(!unreadOnly); setPage(1) }}
          >
            仅未读
          </Button>
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="size-4" />
            全部已读
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64 mt-2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bell className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无通知</h3>
          <p className="text-sm text-muted-foreground mt-1">系统消息和提醒将显示在这里</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-background divide-y divide-border/50 overflow-hidden">
            {items.map(notif => (
              <div
                key={notif.id}
                className="p-5 cursor-pointer hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors"
                onClick={() => handleClick(notif)}
              >
                <div className="flex items-start gap-3">
                  {!notif.is_read ? (
                    <Circle className="size-2 mt-1.5 shrink-0 fill-primary text-primary" />
                  ) : (
                    <span className="size-2 mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm truncate ${!notif.is_read ? 'font-medium' : ''}`}>{notif.title}</span>
                      <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
                        {typeLabels[notif.type ?? ''] ?? notif.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>{formatDate(notif.created_at)}</span>
                      {notif.content && (
                        <span className="truncate">{notif.content}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}
    </div>
  )
}
