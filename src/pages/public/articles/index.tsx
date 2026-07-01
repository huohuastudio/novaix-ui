import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { SimplePagination } from "@/components/simple-pagination"
import { getPublicCmsArticles, getPublicCmsArticleCategories } from "@/api"
import type { PublicPublicArticleItem, PublicPublicArticleCategoryItem } from "@/api"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"

const typeLabels: Record<string, string> = { news: "新闻", announcement: "公告", activity: "活动" }

export default function ArticleList() {
  const siteName = useSiteName()
  const formatDate = useFormatDate()
  useDocumentTitle(`文章 - ${siteName}`)

  const [searchParams, setSearchParams] = useSearchParams()
  const typeFilter = searchParams.get("type") || ""
  const categoryFilter = searchParams.get("category") || ""

  const [articles, setArticles] = useState<PublicPublicArticleItem[]>([])
  const [categories, setCategories] = useState<PublicPublicArticleCategoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCmsArticleCategories()
      .then(({ data: res }) => setCategories(res?.data ?? []))
      .catch(() => {})
  }, [])

  const fetchArticles = useCallback(() => {
    setLoading(true)
    getPublicCmsArticles({
      query: {
        page,
        page_size: pageSize,
        type: typeFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      },
    })
      .then(({ data: res }) => {
        setArticles(res?.data?.items ?? [])
        setTotal(res?.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, typeFilter, categoryFilter])

  useEffect(() => {
    fetchArticles() // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchArticles])

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const setFilters = (updates: Record<string, string>) => {
    setPage(1)
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tighter">文章</h1>
      <p className="mt-2 text-muted-foreground">最新资讯、公告和活动</p>

      {/* 筛选 */}
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => setFilters({ type: "", category: "" })}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors cursor-pointer ${
            !typeFilter && !categoryFilter ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          全部
        </button>
        {Object.entries(typeLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilters({ type: typeFilter === key ? "" : key, category: "" })}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors cursor-pointer ${
              typeFilter === key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilters({ category: categoryFilter === String(c.id) ? "" : String(c.id), type: "" })}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors cursor-pointer ${
              categoryFilter === String(c.id) ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 文章列表 */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <Skeleton className="aspect-[16/9]" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <FileText className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无文章</h3>
          <p className="text-sm text-muted-foreground mt-1">还没有发布任何文章</p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/articles/${encodeURIComponent(article.slug ?? "")}${article.type ? `?type=${encodeURIComponent(article.type)}` : ""}`}
                className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                {article.cover_image ? (
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                    <FileText className="size-8 text-muted-foreground/20" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {article.is_pinned && <Badge variant="default" className="text-[10px]">置顶</Badge>}
                    {article.type && <Badge variant="secondary" className="text-[10px]">{typeLabels[article.type] ?? article.type}</Badge>}
                    {article.category_id && categoryMap.has(article.category_id) && (
                      <Badge variant="outline" className="text-[10px]">{categoryMap.get(article.category_id)}</Badge>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">{formatDate(article.published_at || article.created_at || "")}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  )
}
