import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Search, FolderOpen, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SimplePagination } from "@/components/simple-pagination"
import { getPublicCmsHelpCategories, getPublicCmsHelpArticles } from "@/api"
import type { PublicPublicHelpCategoryItem, PublicPublicHelpArticleItem } from "@/api"
import { useSiteName } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"

export default function HelpCenter() {
  const siteName = useSiteName()
  useDocumentTitle(`帮助中心 - ${siteName}`)

  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFilter = searchParams.get("category") || ""
  const keyword = searchParams.get("q") || ""

  const [categories, setCategories] = useState<PublicPublicHelpCategoryItem[]>([])
  const [articles, setArticles] = useState<PublicPublicHelpArticleItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(keyword)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(keyword)
  }, [keyword])

  useEffect(() => {
    getPublicCmsHelpCategories()
      .then(({ data: res }) => setCategories(res?.data ?? []))
      .catch(() => {})
  }, [])

  const fetchArticles = useCallback(() => {
    setLoading(true)
    getPublicCmsHelpArticles({
      query: {
        page,
        page_size: pageSize,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        keyword: keyword || undefined,
      },
    })
      .then(({ data: res }) => {
        setArticles(res?.data?.items ?? [])
        setTotal(res?.data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, categoryFilter, keyword])

  useEffect(() => {
    fetchArticles() // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchArticles])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    const params = new URLSearchParams(searchParams)
    if (searchInput.trim()) params.set("q", searchInput.trim())
    else params.delete("q")
    setSearchParams(params, { replace: true })
  }

  const setCategory = (id: string) => {
    setPage(1)
    const params = new URLSearchParams(searchParams)
    if (id) params.set("category", id)
    else params.delete("category")
    params.delete("q")
    setSearchInput("")
    setSearchParams(params, { replace: true })
  }

  const showCategories = !categoryFilter && !keyword
  const selectedCategory = categories.find((c) => String(c.id) === categoryFilter)

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter">帮助中心</h1>
        <p className="mt-2 text-muted-foreground">搜索文档或浏览分类</p>
        <form onSubmit={handleSearch} className="mt-6 relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索帮助文章..."
            className="pl-10"
          />
        </form>
      </div>

      {/* 分类网格 */}
      {showCategories && categories.length > 0 && (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(String(cat.id))}
              className="text-left rounded-xl border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  {cat.icon ? (
                    <span className="text-sm">{cat.icon}</span>
                  ) : (
                    <FolderOpen className="size-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                  {cat.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{cat.article_count ?? 0} 篇文章</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {!showCategories && (
        <div className="mt-8">
          {selectedCategory && (
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setCategory("")} className="text-sm text-primary hover:underline cursor-pointer">
                帮助中心
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">{selectedCategory.name}</span>
            </div>
          )}

          {keyword && (
            <p className="mb-6 text-sm text-muted-foreground">
              搜索「{keyword}」的结果（{total} 条）
            </p>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="size-10 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-medium">暂无文章</h3>
              <p className="text-sm text-muted-foreground mt-1">该分类下还没有文章</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/help/${encodeURIComponent(article.slug ?? "")}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{article.title}</span>
                    {(article.view_count ?? 0) > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{article.view_count} 次阅读</span>
                    )}
                  </Link>
                ))}
              </div>
              <div className="mt-6">
                <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}
