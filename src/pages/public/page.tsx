import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getPublicCmsPagesBySlug } from "@/api"
import type { PublicPublicPageItem } from "@/api"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { sanitizeHtml } from "@/lib/sanitize"

export default function CMSPage() {
  const { slug } = useParams<{ slug: string }>()
  const siteName = useSiteName()
  const formatDate = useFormatDate()

  const [page, setPage] = useState<PublicPublicPageItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useDocumentTitle(page ? `${page.title} - ${siteName}` : siteName)

  useEffect(() => {
    if (!slug) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setNotFound(false)
    setPage(null)
    getPublicCmsPagesBySlug({ path: { slug } })
      .then(({ data: res }) => {
        if (res?.code === 0 && res.data) {
          setPage(res.data as PublicPublicPageItem)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-4 w-1/4 mb-8" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    )
  }

  if (notFound || !page) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-xl font-bold mb-2">页面未找到</h2>
        <p className="text-muted-foreground mb-6">该页面不存在或已被删除</p>
        <Button variant="outline" asChild>
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tighter">{page.title}</h1>
      {page.updated_at && (
        <p className="mt-2 text-sm text-muted-foreground">最后更新于 {formatDate(page.updated_at)}</p>
      )}
      <div
        className="mt-8 markdown-body text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content ?? "") }}
      />
    </div>
  )
}
