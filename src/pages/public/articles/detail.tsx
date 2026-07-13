import { useParams, Link, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPublicCmsArticlesBySlugOptions } from "@/api/@tanstack/react-query.gen"
import type { PublicPublicArticleDetail } from "@/api"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { sanitizeHtml } from "@/lib/sanitize"

const typeLabels: Record<string, string> = { news: "新闻", announcement: "公告", activity: "活动" }

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const articleType = searchParams.get("type") || ""
  const siteName = useSiteName()
  const formatDate = useFormatDate()

  const { data: res, isPending, isError } = useQuery({
    ...getPublicCmsArticlesBySlugOptions({
      path: { slug: slug ?? "" },
      query: articleType ? { type: articleType } : undefined,
    }),
    enabled: !!slug,
  })
  const article = res?.code === 0 && res.data
    ? (res.data as PublicPublicArticleDetail)
    : null
  const loading = !!slug && isPending
  const notFound = isError || (res != null && !article)

  useDocumentTitle(article ? `${article.title} - ${siteName}` : siteName)

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/3 mb-8" />
        <Skeleton className="aspect-[2/1] w-full mb-8 rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-xl font-bold mb-2">文章未找到</h2>
        <p className="text-muted-foreground mb-6">该文章不存在或已被删除</p>
        <Button variant="outline" asChild>
          <Link to="/articles">返回文章列表</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Button variant="ghost" size="sm" className="mb-6" asChild>
        <Link to="/articles">
          <ArrowLeft className="size-4" />
          返回文章列表
        </Link>
      </Button>

      <div className="flex items-center gap-2 mb-4">
        {article.type && <Badge variant="secondary">{typeLabels[article.type] ?? article.type}</Badge>}
      </div>

      <h1 className="text-3xl font-bold tracking-tighter">{article.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDate(article.published_at || article.created_at || "")}
      </p>

      {article.cover_image && (
        <div className="mt-6 rounded-xl overflow-hidden bg-muted">
          <img src={article.cover_image} alt={article.title} className="w-full" />
        </div>
      )}

      <div
        className="mt-8 markdown-body text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content ?? "") }}
      />
    </div>
  )
}
