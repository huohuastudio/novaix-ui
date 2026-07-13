import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { keepPreviousData, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
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
  /** 基础 queryKey（不含分页参数），传接口生成的 xxxQueryKey()；分页/排序/筛选参数由 hook 内部追加 */
  queryKey: QueryKey
  defaultPageSize?: number
  filterKeys?: string[]
  /** 自动刷新间隔（毫秒），后台静默刷新当前页；false 或省略为不刷新 */
  refetchInterval?: number | false
  /**
   * 是否将分页/排序/筛选状态同步到 URL（默认 true）。
   * 同页多表格/嵌入式 tab 场景设为 false，避免多个表格争抢同一组 URL 参数
   */
  syncUrl?: boolean
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
  queryKey: baseQueryKey,
  defaultPageSize = 20,
  filterKeys = [],
  refetchInterval,
  syncUrl = true,
}: UseDataTableOptions<T>) {
  // hooks 不能条件调用，syncUrl 为 false 时照常调用但不解析、不写回
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const initialState = useMemo(
    () =>
      syncUrl
        ? parseStateFromURL(searchParams, defaultPageSize, filterKeys)
        : {
            pagination: { pageIndex: 0, pageSize: defaultPageSize } satisfies PaginationState,
            sorting: [] as SortingState,
            columnFilters: [] as ColumnFiltersState,
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在首次渲染时解析 URL 参数
    [],
  )

  const [pagination, setPagination] = useState<PaginationState>(initialState.pagination)
  const [sorting, setSorting] = useState<SortingState>(initialState.sorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialState.columnFilters)

  // 排序/筛选变化时在渲染期重置回第一页（React「在渲染期间调整状态」模式），
  // 被丢弃的渲染不会 commit，因此不会按旧页码多发一次请求
  const [prevSorting, setPrevSorting] = useState(sorting)
  const [prevFilters, setPrevFilters] = useState(columnFilters)
  if (prevSorting !== sorting || prevFilters !== columnFilters) {
    setPrevSorting(sorting)
    setPrevFilters(columnFilters)
    if (pagination.pageIndex !== 0) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
  }

  // 分页/排序/筛选状态同步到 URL（可分享、刷新不丢状态）；syncUrl 为 false 时跳过
  useEffect(() => {
    if (!syncUrl) return
    const newParams = buildSearchParams(pagination, sorting, columnFilters, defaultPageSize)
    if (newParams.toString() !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true })
    }
  }, [syncUrl, pagination, sorting, columnFilters, defaultPageSize, searchParams, setSearchParams])

  const filters: Record<string, unknown> = {}
  for (const f of columnFilters) {
    if (f.value !== "" && f.value != null) {
      filters[f.id] = f.value
    }
  }
  const queryParams: FetchParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sorting,
    filters,
  }

  // 请求去重、竞态丢弃、后台刷新均由 query 内核保证；
  // keepPreviousData 使翻页/筛选期间旧数据保持可见（fetching 为 true），不再闪加载态
  const query = useQuery({
    queryKey: [...baseQueryKey, queryParams],
    queryFn: () => fetchFn(queryParams),
    placeholderData: keepPreviousData,
    refetchInterval,
  })

  // 基础 key 由调用方每次渲染重新构造，经 ref 稳定 refresh 的回调身份
  const baseKeyRef = useRef(baseQueryKey)
  useEffect(() => {
    baseKeyRef.current = baseQueryKey
  })

  // 失效该接口的全部缓存（含其他分页/筛选组合）并后台重取当前页，不闪加载态
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: baseKeyRef.current })
  }, [queryClient])

  // 稳定引用的空页对象，避免每次渲染重建新对象击穿下游 memo
  const emptyPage = useMemo<PaginatedData<T>>(
    () => ({ items: [], total: 0, page: 1, page_size: defaultPageSize }),
    [defaultPageSize],
  )

  return {
    data: query.data ?? emptyPage,
    /** 仅首次加载为 true；后续翻页/刷新见 fetching */
    loading: query.isPending,
    /** 后台刷新中（已有数据可见），供表格渲染细微的刷新指示 */
    fetching: query.isFetching && !query.isPending,
    error: query.error ?? undefined,
    pagination,
    setPagination,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    refresh,
  }
}
