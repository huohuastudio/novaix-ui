"use no memo";
import { Fragment, useEffect, useRef, useState } from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// -- Types --

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface FilterOption {
  label: string
  value: string
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    filterVariant?: "text" | "select"
    filterOptions?: FilterOption[]
    filterPlaceholder?: string
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: PaginatedData<TData> | undefined
  loading?: boolean
  error?: Error
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  /** 关闭整张表的排序交互（用于接口不支持排序的列表）。默认沿用各列设置 */
  enableSorting?: boolean
  toolbar?: React.ReactNode
  /** 提供时，行可点击展开，在行下方渲染返回的内容。一次仅展开一行 */
  renderExpanded?: (row: TData) => React.ReactNode
  /** 自定义行的唯一标识（用于展开状态）。默认使用 tanstack 行索引 */
  getRowId?: (row: TData) => string
  /** 数据为空时的自定义展示内容，替代默认的"暂无数据"文字 */
  emptyState?: React.ReactNode
  /** 新手教程高亮标识 */
  tourId?: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 400,
  ...props
}: {
  value: string
  onChange: (value: string) => void
  debounce?: number
} & Omit<React.ComponentProps<typeof Input>, "onChange">) {
  const [value, setValue] = useState(initialValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同步外部受控值到内部防抖状态
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => onChange(e.target.value), debounce)
      }}
    />
  )
}

// -- Component --

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  error,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  columnFilters: externalFilters,
  onColumnFiltersChange: externalOnFiltersChange,
  enableSorting,
  toolbar,
  renderExpanded,
  getRowId,
  emptyState,
  tourId,
}: DataTableProps<TData, TValue>) {
  const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>([])
  const columnFilters = externalFilters ?? internalFilters
  const onColumnFiltersChange = externalOnFiltersChange ?? setInternalFilters
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const pageCount = data ? Math.ceil(data.total / pagination.pageSize) : 0
  const hasActiveFilters = columnFilters.some((f) => f.value !== "" && f.value != null)

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    pageCount,
    getRowId,
    state: {
      pagination,
      sorting,
      columnFilters,
    },
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    ...(enableSorting === undefined ? {} : { enableSorting }),
  })

  const filterableColumns = table.getAllColumns().filter(
    (col) => col.columnDef.meta?.filterVariant
  )

  return (
    <div className="flex flex-col gap-4" data-tour={tourId}>
      {/* Filter bar */}
      {(filterableColumns.length > 0 || toolbar) && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 sm:gap-3">
          {filterableColumns.map((column) => {
            const meta = column.columnDef.meta!
            const filterValue = (column.getFilterValue() as string) ?? ""

            if (meta.filterVariant === "select") {
              return (
                <Select
                  key={column.id}
                  value={filterValue}
                  onValueChange={(value) =>
                    column.setFilterValue(value === "__all__" ? "" : value)
                  }
                >
                  <SelectTrigger className="h-8 w-[calc(50%-0.25rem)] min-w-0 sm:w-[150px]">
                    <SelectValue placeholder={meta.filterPlaceholder ?? `${String(column.columnDef.header)}...`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__all__">全部</SelectItem>
                    {meta.filterOptions?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }

            return (
              <DebouncedInput
                key={column.id}
                placeholder={meta.filterPlaceholder ?? `搜索${String(column.columnDef.header)}...`}
                value={filterValue}
                onChange={(value) => column.setFilterValue(value)}
                className="h-8 w-full min-w-0 sm:w-[200px] sm:flex-none"
              />
            )
          })}
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => onColumnFiltersChange([])}
            >
              <RotateCcw className="size-3.5" />
              重置
            </Button>
          )}
          {toolbar && <div className="max-sm:w-full sm:ml-auto">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-md">
        <table className="w-full caption-bottom text-sm min-w-[800px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-1 hover:text-foreground transition-colors",
                            sorted && "text-foreground"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-destructive"
                >
                  加载失败，请稍后重试
                </TableCell>
              </TableRow>
            ) : loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const expandable = !!renderExpanded
                const isExpanded = expandable && expandedRowId === row.id
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      data-state={isExpanded ? "selected" : undefined}
                      className={cn(expandable && "cursor-pointer")}
                      onClick={
                        expandable
                          ? (e) => {
                              // 忽略来自行内交互元素（按钮/链接/Popover 触发器等）的点击，避免与展开冲突
                              if ((e.target as HTMLElement).closest('button, a, input, select, [role="button"], [role="combobox"]')) return
                              setExpandedRowId((prev) => (prev === row.id ? null : row.id))
                            }
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={columns.length} className="bg-muted/30 p-0">
                          {renderExpanded(row.original)}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className={emptyState && !hasActiveFilters ? "p-0" : "h-24 text-center text-muted-foreground"}
                >
                  {hasActiveFilters ? "没有匹配结果" : (emptyState ?? "暂无数据")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>

      {/* Pagination */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {data?.total ?? 0} 条
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm">每页</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) =>
                onPaginationChange({ pageIndex: 0, pageSize: Number(value) })
              }
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm">条</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="hidden sm:inline-flex size-8"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-sm">
              {pagination.pageIndex + 1} / {pageCount || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden sm:inline-flex size-8"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
