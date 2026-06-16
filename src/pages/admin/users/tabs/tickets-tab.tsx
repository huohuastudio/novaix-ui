import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table"
import { getAdminTickets } from "@/api"
import type { TicketTicketItem } from "@/api"
import { DataTable, type PaginatedData } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { statusMap as ticketStatusMap, priorityMap as ticketPriorityMap } from "@/pages/admin/tickets/constants"

export function TicketsTab({ userId }: { userId: number }) {
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const [data, setData] = useState<PaginatedData<TicketTicketItem>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const sort = sorting[0]?.id as "id" | "created_at" | "last_reply_at" | undefined
      const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
      const { data: res } = await getAdminTickets({
        query: {
          user_id: userId,
          page: pagination.pageIndex + 1,
          page_size: pagination.pageSize,
          sort,
          order,
        },
      })
      if (res?.code !== 0) {
        setError(new Error(res?.message || "请求失败"))
        return
      }
      setData({
        items: res?.data?.items ?? [],
        total: res?.data?.total ?? 0,
        page: res?.data?.page ?? 1,
        page_size: res?.data?.page_size ?? pagination.pageSize,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("请求失败"))
    } finally {
      setLoading(false)
    }
  }, [userId, pagination, sorting])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
    fetchData()
  }, [fetchData])

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
      data={data}
      loading={loading}
      error={error}
      enableSorting={false}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  )
}
