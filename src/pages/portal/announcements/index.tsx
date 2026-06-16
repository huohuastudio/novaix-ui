import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getPortalAnnouncements } from '@/api'
import { sanitizeHtml } from '@/lib/sanitize'
import type { PortalPortalAnnouncementItem } from '@/api'
import { SimplePagination } from '@/components/simple-pagination'
import { useSiteName, useFormatDate } from '@/hooks/use-site-settings'
import { useDocumentTitle } from '@uidotdev/usehooks'

export default function PortalAnnouncements() {
  const siteName = useSiteName()
  const formatDate = useFormatDate()
  useDocumentTitle(`公告 - ${siteName}`)

  const [announcements, setAnnouncements] = useState<PortalPortalAnnouncementItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PortalPortalAnnouncementItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 加载数据
    setLoading(true)
    getPortalAnnouncements({ query: { page, page_size: pageSize } })
      .then(({ data: res }) => {
        setAnnouncements(res?.data?.items ?? [])
        setTotal(res?.data?.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">公告</h1>
        <p className="mt-1 text-sm text-muted-foreground">系统公告与通知</p>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3 mt-2" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Megaphone className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无公告</h3>
          <p className="text-sm text-muted-foreground mt-1">暂时没有新的公告</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {announcements.map((item) => (
              <button
                key={item.id}
                className="w-full text-left p-5 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                onClick={() => { setSelected(item); setDialogOpen(true) }}
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(item.created_at ?? '')}</p>
              </button>
            ))}
          </div>
          <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setTimeout(() => setSelected(null), 200) }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <p className="text-xs text-muted-foreground">{formatDate(selected.created_at ?? '')}</p>
              </DialogHeader>
              <div
                className="markdown-body text-sm overflow-y-auto [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.content ?? '') }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
