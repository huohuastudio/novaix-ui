import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getPublicCmsHelpArticlesBySlug, getPublicCmsHelpArticles } from "@/api"
import type { PublicPublicHelpArticleDetail, PublicPublicHelpArticleItem } from "@/api"
import { useSiteName } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { sanitizeHtml } from "@/lib/sanitize"

export default function HelpDetail() {
  const { slug } = useParams<{ slug: string }>()
  const siteName = useSiteName()

  const [article, setArticle] = useState<PublicPublicHelpArticleDetail | null>(null)
  const [related, setRelated] = useState<PublicPublicHelpArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useDocumentTitle(article ? `${article.title} - 帮助中心 - ${siteName}` : siteName)

  useEffect(() => {
    if (!slug) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setNotFound(false)
    setArticle(null)
    setRelated([])
    getPublicCmsHelpArticlesBySlug({ path: { slug } })
      .then(({ data: res }) => {
        if (res?.code === 0 && res.data) {
          const detail = res.data as PublicPublicHelpArticleDetail
          setArticle(detail)
          if (detail.category_id) {
            getPublicCmsHelpArticles({ query: { category_id: detail.category_id, page_size: 10 } })
              .then(({ data: r }) => setRelated((r?.data?.items ?? []).filter((a) => a.slug !== slug)))
              .catch(() => {})
          }
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_280px] gap-12">
          <div>
            <Skeleton className="h-4 w-24 mb-6" />
            <Skeleton className="h-8 w-3/4 mb-8" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
          <div className="hidden lg:block space-y-3">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-xl font-bold mb-2">文章未找到</h2>
        <p className="text-muted-foreground mb-6">该帮助文章不存在或已被删除</p>
        <Button variant="outline" asChild>
          <Link to="/help">返回帮助中心</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="grid lg:grid-cols-[1fr_280px] gap-12">
        <div>
          <Button variant="ghost" size="sm" className="mb-6" asChild>
            <Link to="/help">
              <ArrowLeft className="size-4" />
              帮助中心
            </Link>
          </Button>

          <h1 className="text-2xl font-bold tracking-tighter">{article.title}</h1>

          <div
            className="mt-8 markdown-body text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content ?? "") }}
          />
        </div>

        {related.length > 0 && (
          <aside className="hidden lg:block">
            <h3 className="text-sm font-semibold mb-4">相关文章</h3>
            <div className="space-y-2">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/help/${encodeURIComponent(r.slug ?? "")}`}
                  className="flex items-start gap-2 p-2 -mx-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <FileText className="size-3.5 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{r.title}</span>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
