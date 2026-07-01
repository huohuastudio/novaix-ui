import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExportButton } from "@/components/export-button"
import { Input } from "@/components/ui/input"
import { getAdminLogs } from "@/api"
import type { LogLogItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate } from "@/hooks/use-site-settings"
import { UserPopover } from "@/components/user-popover"
import { actionMap } from "./constants"

const actionOptions = Object.entries(actionMap).map(([value, { label }]) => ({ label, value }))

export default function Logs() {
  useBreadcrumb([{ label: "操作日志" }])
  const formatDate = useFormatDate()

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminLogs({
      query: {
        page,
        page_size: pageSize,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        action: (filters.action as string) || undefined,
        keyword: (filters.keyword as string) || undefined,
        start_date: (filters.start_date as string) || undefined,
        end_date: (filters.end_date as string) || undefined,
        sort,
        order,
      },
    })

    return {
      items: res?.data?.items ?? [],
      total: res?.data?.total ?? 0,
      page: res?.data?.page ?? 1,
      page_size: res?.data?.page_size ?? pageSize,
    }
  }, [])

  const table = useDataTable({
    fetchFn: fetchData,
    filterKeys: ["action", "user_id", "keyword", "start_date", "end_date"],
  })

  const applyDateFilter = useCallback((start: string, end: string) => {
    table.setColumnFilters(prev => {
      const next = prev.filter(f => !["start_date", "end_date"].includes(f.id))
      if (start) next.push({ id: "start_date", value: start })
      if (end) next.push({ id: "end_date", value: end })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.setColumnFilters])

  const exportParams = useMemo(() => {
    const params: Record<string, string> = {}
    for (const f of table.columnFilters) {
      if (f.value) params[f.id] = String(f.value)
    }
    return params
  }, [table.columnFilters])

  const columns: ColumnDef<LogLogItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
      size: 60,
    },
    {
      accessorKey: "action",
      header: "操作类型",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "操作类型",
        filterOptions: actionOptions,
      },
      cell: ({ row }) => {
        const a = actionMap[row.getValue("action") as string]
        return a ? <Badge variant={a.variant}>{a.label}</Badge> : <Badge variant="outline">{row.getValue("action")}</Badge>
      },
    },
    {
      id: "keyword",
      header: "操作人",
      enableSorting: false,
      meta: {
        filterVariant: "text" as const,
        filterPlaceholder: "搜索用户名/目标/详情...",
      },
      cell: ({ row }) => (
        <UserPopover userId={row.original.user_id} username={row.original.username} />
      ),
    },
    {
      accessorKey: "target",
      header: "操作目标",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.target || "-"}</span>
      ),
    },
    {
      accessorKey: "detail",
      header: "详情",
      enableSorting: false,
    },
    {
      accessorKey: "ip",
      header: "IP 地址",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.ip}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ], [formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">操作日志</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看系统操作记录</p>
      </div>
      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); applyDateFilter(e.target.value, endDate) }}
              className="w-36"
            />
            <span className="text-muted-foreground text-sm">至</span>
            <Input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); applyDateFilter(startDate, e.target.value) }}
              className="w-36"
            />
            {(startDate || endDate) && (
              <Button variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); applyDateFilter("", "") }}>
                清除
              </Button>
            )}
            <ExportButton endpoint="logs" params={exportParams} disabled={table.data.total === 0} />
          </div>
        }
      />
    </div>
  )
}
