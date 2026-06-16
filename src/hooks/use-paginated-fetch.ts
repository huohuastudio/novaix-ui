import { useEffect, useState, useCallback, useRef } from "react"

export interface PaginatedFetchResult<T> {
  items: T[]
  hasMore: boolean
}

export function usePaginatedFetch<T>(
  open: boolean,
  fetchFn: (page: number, keyword: string) => Promise<PaginatedFetchResult<T>>,
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchItems = useCallback(async (p: number, kw: string, append: boolean) => {
    setLoading(true)
    try {
      const result = await fetchFn(p, kw)
      setItems((prev) => append ? [...prev, ...result.items] : result.items)
      setHasMore(result.hasMore)
      setPage(p)
      return result.items
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  const resetAndFetch = useCallback(() => {
    setKeyword("")
    setPage(1)
    setHasMore(true)
    fetchItems(1, "", false)
  }, [fetchItems])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时重置并加载数据
    resetAndFetch()
  }, [open, resetAndFetch])

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const handleSearch = useCallback((val: string) => {
    setKeyword(val)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchItems(1, val, false)
    }, 300)
  }, [fetchItems])

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchItems(page + 1, keyword, true)
  }, [loading, hasMore, page, keyword, fetchItems])

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!hasMore || loading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const root = sentinel.closest("[cmdk-list]") as Element | null
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore()
      },
      { root, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, handleLoadMore])

  return {
    items,
    loading,
    keyword,
    hasMore,
    handleSearch,
    handleLoadMore,
    sentinelRef,
    fetchItems,
  }
}
