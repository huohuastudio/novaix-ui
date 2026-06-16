import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table"
import { getAdminTransactions } from "@/api"
import type { OrderTransactionItem } from "@/api"
import { DataTable, type PaginatedData } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { txTypeMap } from "@/lib/order-constants"

export function TransactionsTab({ userId }: { userId: number }) {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const [data, setData] = useState<PaginatedData<OrderTransactionItem>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const sort = sorting[0]?.id as "id" | "created_at" | undefined
      const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
      const { data: res } = await getAdminTransactions({
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
