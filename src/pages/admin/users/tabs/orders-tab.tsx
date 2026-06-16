import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table"
import { getAdminOrders } from "@/api"
import type { OrderOrderItem } from "@/api"
import { DataTable, type PaginatedData } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useFormatAmount, useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { orderTypeMap, orderStatusMap, billingCycleMap } from "@/lib/order-constants"

export function OrdersTab({ userId }: { userId: number }) {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const [data, setData] = useState<PaginatedData<OrderOrderItem>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const sort = sorting[0]?.id as "id" | "amount" | "created_at" | undefined
      const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
      const { data: res } = await getAdminOrders({
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

  const columns: ColumnDef<OrderOrderItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "order_no",
      header: "订单号",
      cell: ({ row }) => (
        <Link
          to={`${adminPath}/orders/${row.original.id}`}
          className="text-primary hover:underline font-mono text-xs"
        >
          {row.original.order_no}
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => orderTypeMap[row.original.type ?? ""] ?? row.original.type,
    },
    {
      accessorKey: "billing_cycle",
      header: "周期",
      cell: ({ row }) => billingCycleMap[row.original.billing_cycle ?? ""] ?? row.original.billing_cycle ?? "-",
    },
    {
      accessorKey: "amount",
      header: "金额",
      enableSorting: true,
      cell: ({ row }) => formatAmount(row.original.amount ?? 0),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = orderStatusMap[row.original.status ?? ""] ?? { label: row.original.status, variant: "outline" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      accessorKey: "plan_name",
      header: "套餐",
      cell: ({ row }) => row.original.plan_name ?? "-",
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ], [formatAmount, formatDate, adminPath])

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
