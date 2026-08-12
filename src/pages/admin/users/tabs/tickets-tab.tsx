import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { MessageSquare } from "lucide-react"
import type { TicketTicketItem } from "@/api"
import { getAdminTickets } from "@/api"
import { getAdminTicketsQueryKey } from "@/api/@tanstack/react-query.gen"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { statusMap as ticketStatusMap, priorityMap as ticketPriorityMap } from "@/pages/admin/tickets/constants"

export function TicketsTab({ userId }: { userId: number }) {
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()

  const fetchTickets = useCallback(async ({ page, pageSize, sorting }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "created_at" | "last_reply_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
    const { data: res } = await getAdminTickets({
      query: { user_id: userId, page, page_size: pageSize, sort, order },
    })
    if (!res || res.code !== 0) throw new Error(res?.message || "请求失败")
    return {
      items: res.data?.items ?? [],
      total: res.data?.total ?? 0,
      page: res.data?.page ?? 1,
      page_size: res.data?.page_size ?? pageSize,
    }
  }, [userId])

  // user_id 是真实接口参数，随 queryKey 区分不同用户的缓存；嵌入 tab 场景不同步 URL
  const table = useDataTable<TicketTicketItem>({
    fetchFn: fetchTickets,
    queryKey: getAdminTicketsQueryKey({ query: { user_id: userId } }),
    syncUrl: false,
  })

  const columns: ColumnDef<TicketTicketItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "subject",
      header: "主题",
      cell: ({ row }) => (
        <Link
          to={`${adminPath}/tickets/${row.original.id}`}
          className="text-primary hover:underline font-medium max-w-[300px] truncate block"
        >
          {row.original.subject}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = ticketStatusMap[row.original.status ?? ""] ?? { label: row.original.status, variant: "outline" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      accessorKey: "priority",
      header: "优先级",
      cell: ({ row }) => ticketPriorityMap[row.original.priority ?? 0]?.label ?? "未知",
    },
    {
      accessorKey: "reply_count",
      header: "回复",
      cell: ({ row }) => row.original.reply_count ?? 0,
    },
    {
      accessorKey: "last_reply_at",
      header: "最后回复",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.last_reply_at),
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ], [formatDate, adminPath])

  return (
    <DataTable
      columns={columns}
      data={table.data}
      loading={table.loading}
      fetching={table.fetching}
      error={table.error}
      enableSorting={false}
      pagination={table.pagination}
      onPaginationChange={table.setPagination}
      sorting={table.sorting}
      onSortingChange={table.setSorting}
      emptyIcon={MessageSquare}
      emptyTitle="暂无工单"
      emptyDescription="该用户还没有提交任何工单"
    />
  )
}
