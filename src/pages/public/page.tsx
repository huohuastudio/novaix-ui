import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getPublicCmsPagesBySlugOptions } from "@/api/@tanstack/react-query.gen"
import type { PublicPublicPageItem } from "@/api"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { sanitizeHtml } from "@/lib/sanitize"

export default function CMSPage() {
  const { slug } = useParams<{ slug: string }>()
  const siteName = useSiteName()
  const formatDate = useFormatDate()

  const { data: res, isPending, isError } = useQuery({
    ...getPublicCmsPagesBySlugOptions({ path: { slug: slug ?? "" } }),
    enabled: !!slug,
  })
  const page = res?.code === 0 && res.data
    ? (res.data as PublicPublicPageItem)
    : null
  const loading = !!slug && isPending
  const notFound = isError || (res != null && !page)

  useDocumentTitle(page ? `${page.title} - ${siteName}` : siteName)

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
