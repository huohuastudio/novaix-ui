import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table"
import { getAdminPayments } from "@/api"
import type { PaymentAdminPaymentItem } from "@/api"
import { DataTable, type PaginatedData } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { paymentStatusMap } from "@/lib/payment"
import { useProviderMap } from "@/hooks/use-provider-map"

export function PaymentsTab({ userId }: { userId: number }) {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const providerMap = useProviderMap("payment")
  const [data, setData] = useState<PaginatedData<PaymentAdminPaymentItem>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const sort = sorting[0]?.id as "id" | "amount" | "created_at" | "paid_at" | undefined
      const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
      const { data: res } = await getAdminPayments({
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

  const columns: ColumnDef<PaymentAdminPaymentItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "payment_no",
      header: "支付单号",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.payment_no || "-"}</span>
      ),
    },
    {
      accessorKey: "provider",
      header: "渠道",
      cell: ({ row }) => providerMap[row.original.provider ?? ""] ?? row.original.provider,
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
        const s = paymentStatusMap[row.original.status ?? ""] ?? { label: row.original.status, variant: "outline" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      accessorKey: "trade_no",
      header: "交易号",
      cell: ({ row }) => (
        <span className="font-mono text-xs max-w-[200px] truncate block">
          {row.original.trade_no || "-"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: "paid_at",
      header: "支付时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.paid_at),
    },
  ], [formatAmount, formatDate, providerMap])

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
