import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import type { OrderOrderItem } from "@/api"
import { getAdminOrders } from "@/api"
import { getAdminOrdersQueryKey } from "@/api/@tanstack/react-query.gen"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatAmount, useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { orderTypeMap, orderStatusMap, billingCycleMap } from "@/lib/order-constants"

export function OrdersTab({ userId }: { userId: number }) {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()

  const fetchOrders = useCallback(async ({ page, pageSize, sorting }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "amount" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
    const { data: res } = await getAdminOrders({
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
  const table = useDataTable<OrderOrderItem>({
    fetchFn: fetchOrders,
    queryKey: getAdminOrdersQueryKey({ query: { user_id: userId } }),
    syncUrl: false,
  })

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
      data={table.data}
      loading={table.loading}
      fetching={table.fetching}
      error={table.error}
      enableSorting={false}
      pagination={table.pagination}
      onPaginationChange={table.setPagination}
      sorting={table.sorting}
      onSortingChange={table.setSorting}
    />
  )
}
