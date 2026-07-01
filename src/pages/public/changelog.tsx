import { useCallback, useEffect, useState } from "react"
import { History } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { SimplePagination } from "@/components/simple-pagination"
import { getPublicCmsChangelogs } from "@/api"
import type { PublicPublicChangelogItem } from "@/api"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { sanitizeHtml } from "@/lib/sanitize"

export default function Changelog() {
  const siteName = useSiteName()
  const formatDate = useFormatDate()
  useDocumentTitle(`更新日志 - ${siteName}`)

  const [items, setItems] = useState<PublicPublicChangelogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    getPublicCmsChangelogs({ query: { page, page_size: pageSize } })
      .then(({ data: res }) => {
        setItems(res?.data?.items ?? [])
        setTotal(res?.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchData() // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchData])

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-center">更新日志</h1>
      <p className="mt-2 text-muted-foreground text-center">产品更新与版本发布记录</p>

      {loading ? (
        <div className="mt-10 space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <History className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无更新日志</h3>
        </div>
      ) : (
        <>
          <div className="mt-10 relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />
            <div className="space-y-10">
              {items.map((item) => (
                <div key={item.id} className="relative pl-8">
                  <div className="absolute left-0 top-1 size-[23px] rounded-full border-2 border-primary bg-background flex items-center justify-center">
                    <div className="size-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-sm font-mono">{item.version}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.published_at ?? "")}</p>
                    <div
                      className="mt-3 markdown-body text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content ?? "") }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10">
            <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  )
}
