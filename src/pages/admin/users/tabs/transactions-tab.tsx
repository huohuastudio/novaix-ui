import { useCallback, useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import type { OrderTransactionItem } from "@/api"
import { getAdminTransactions } from "@/api"
import { getAdminTransactionsQueryKey } from "@/api/@tanstack/react-query.gen"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { txTypeMap } from "@/lib/order-constants"

export function TransactionsTab({ userId }: { userId: number }) {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()

  const fetchTransactions = useCallback(async ({ page, pageSize, sorting }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
    const { data: res } = await getAdminTransactions({
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
  const table = useDataTable<OrderTransactionItem>({
    fetchFn: fetchTransactions,
    queryKey: getAdminTransactionsQueryKey({ query: { user_id: userId } }),
    syncUrl: false,
  })

  const columns: ColumnDef<OrderTransactionItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const label = txTypeMap[row.original.type ?? ""]?.label ?? row.original.type
        return <Badge variant="outline">{label}</Badge>
      },
    },
    {
      accessorKey: "amount",
      header: "金额",
      cell: ({ row }) => {
        const amount = row.original.amount ?? 0
        const isPositive = amount > 0
        return (
          <span className={`font-mono font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{formatAmount(amount)}
          </span>
        )
      },
    },
    {
      accessorKey: "balance",
      header: "交易后余额",
      cell: ({ row }) => (
        <span className="font-mono">{formatAmount(row.original.balance ?? 0)}</span>
      ),
    },
    {
      accessorKey: "remark",
      header: "备注",
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[200px] truncate block">
          {row.original.remark || "-"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ], [formatAmount, formatDate])

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
      emptyIcon={ArrowUpDown}
      emptyTitle="暂无交易记录"
      emptyDescription="该用户还没有任何交易记录"
    />
  )
}
