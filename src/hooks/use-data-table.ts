import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table"
import type { PaginatedData } from "@/components/data-table"

export interface FetchParams {
  page: number
  pageSize: number
  sorting: SortingState
  filters: Record<string, unknown>
}

interface UseDataTableOptions<T> {
  fetchFn: (params: FetchParams) => Promise<PaginatedData<T>>
  defaultPageSize?: number
  filterKeys?: string[]
}

function parseStateFromURL(
  searchParams: URLSearchParams,
  defaultPageSize: number,
  filterKeys: string[],
): { pagination: PaginationState; sorting: SortingState; columnFilters: ColumnFiltersState } {
  const page = Number(searchParams.get("page")) || 1
  const pageSize = Number(searchParams.get("page_size")) || defaultPageSize

  let sorting: SortingState = []
  const sort = searchParams.get("sort")
  if (sort) {
    sorting = [{ id: sort, desc: searchParams.get("order") !== "asc" }]
  }

  const columnFilters: ColumnFiltersState = []
  for (const key of filterKeys) {
    const value = searchParams.get(key)
    if (value) {
      columnFilters.push({ id: key, value })
    }
  }

  return {
    pagination: { pageIndex: page - 1, pageSize },
    sorting,
    columnFilters,
  }
}

function buildSearchParams(
  pagination: PaginationState,
  sorting: SortingState,
  columnFilters: ColumnFiltersState,
  defaultPageSize: number,
): URLSearchParams {
  const params = new URLSearchParams()

  if (pagination.pageIndex > 0) {
    params.set("page", String(pagination.pageIndex + 1))
  }
  if (pagination.pageSize !== defaultPageSize) {
    params.set("page_size", String(pagination.pageSize))
  }

  if (sorting.length > 0) {
    params.set("sort", sorting[0].id)
    params.set("order", sorting[0].desc ? "desc" : "asc")
  }

  for (const f of columnFilters) {
    if (f.value !== "" && f.value != null) {
      params.set(f.id, String(f.value))
    }
  }

  return params
}

export function useDataTable<T>({
  fetchFn,
  defaultPageSize = 20,
  filterKeys = [],
}: UseDataTableOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialState = useMemo(
    () => parseStateFromURL(searchParams, defaultPageSize, filterKeys),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在首次渲染时解析 URL 参数
    [],
  )

  const [data, setData] = useState<PaginatedData<T>>({ items: [], total: 0, page: 1, page_size: defaultPageSize })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [pagination, setPagination] = useState<PaginationState>(initialState.pagination)
  const [sorting, setSorting] = useState<SortingState>(initialState.sorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialState.columnFilters)
  const [refreshKey, setRefreshKey] = useState(0)

  const prevSortingRef = useRef(sorting)
  const prevFiltersRef = useRef(columnFilters)
  // 组件挂载标记：守卫卸载后的静默刷新写回（前台请求另由各自的 disposed 标记守卫）
  const mountedRef = useRef(true)
  // 前台请求序号：每次前台请求（筛选/翻页/排序/手动刷新）递增，供静默刷新判断其在飞期间是否有前台请求发起
  const fgSeqRef = useRef(0)
  // 在飞的前台请求数：静默刷新仅在无前台请求在飞时才允许写回
  const fgInflightRef = useRef(0)
  // 持有最新的分页/排序/筛选状态，使 refreshSilent 身份保持稳定（避免翻页/筛选时反复重建自动刷新定时器）
  const latestStateRef = useRef({ pagination, sorting, columnFilters })
  useEffect(() => {
    latestStateRef.current = { pagination, sorting, columnFilters }
  }, [pagination, sorting, columnFilters])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchData = useCallback((
    paginationVal: PaginationState,
    sortingVal: SortingState,
    filtersVal: ColumnFiltersState,
    silent = false,
  ) => {
    const filters: Record<string, unknown> = {}
    for (const f of filtersVal) {
      if (f.value !== "" && f.value != null) {
        filters[f.id] = f.value
      }
    }
    const params = {
      page: paginationVal.pageIndex + 1,
      pageSize: paginationVal.pageSize,
      sorting: sortingVal,
      filters,
    }

    // 静默刷新（后台轮询）：不触发 loading/error，且完全让位于前台请求——
    // 仅在其在飞期间无前台请求发起、当前无前台请求在飞、且组件仍挂载时才写回，绝不抢占或丢弃前台结果
    if (silent) {
      const fgSnapshot = fgSeqRef.current
      fetchFn(params)
        .then((result) => {
          if (mountedRef.current && fgSeqRef.current === fgSnapshot && fgInflightRef.current === 0) {
            setData(result)
          }
        })
        .catch(() => {
          // 静默刷新失败不展示错误，保持当前数据
        })
      return
    }

    // 前台请求：始终展示 loading，其结果对当前状态具有权威性
    ++fgSeqRef.current
    fgInflightRef.current++
    let disposed = false
    setError(undefined)
    setLoading(true)

    fetchFn(params)
      .then((result) => {
        if (!disposed) setData(result)
      })
      .catch((err) => {
        if (!disposed) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        fgInflightRef.current--
        if (!disposed) setLoading(false)
      })

    // effect 清理（筛选/翻页变更或组件卸载）时作废本次前台请求：
    // 不再写回数据、不再清理 loading（交由接管的新前台请求负责）
    return () => {
      disposed = true
    }
  }, [fetchFn])

  useEffect(() => {
    const sortingChanged = prevSortingRef.current !== sorting
    const filtersChanged = prevFiltersRef.current !== columnFilters
    prevSortingRef.current = sorting
    prevFiltersRef.current = columnFilters

    const effectivePageIndex =
      (sortingChanged || filtersChanged) && pagination.pageIndex !== 0
        ? 0
        : pagination.pageIndex

    if (effectivePageIndex !== pagination.pageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }

    const effectivePagination = { ...pagination, pageIndex: effectivePageIndex }
    const newParams = buildSearchParams(effectivePagination, sorting, columnFilters, defaultPageSize)
    if (newParams.toString() !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true })
    }

    return fetchData(effectivePagination, sorting, columnFilters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination, sorting, columnFilters, fetchData, refreshKey, defaultPageSize, setSearchParams])

  return {
    data,
    loading,
    error,
    pagination,
    setPagination,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    refresh: useCallback(() => {
      setRefreshKey((k) => k + 1)
    }, []),
    // 静默刷新当前页数据，不触发 loading/error 态（用于自动刷新等后台轮询场景）
    // 从 ref 读取最新状态，保持回调身份稳定，避免自动刷新定时器被反复销毁重建
    refreshSilent: useCallback(() => {
      const { pagination, sorting, columnFilters } = latestStateRef.current
      fetchData(pagination, sorting, columnFilters, true)
    }, [fetchData]),
  }
}
