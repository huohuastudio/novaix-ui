import { useCallback, useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { PaymentAdminPaymentItem } from "@/api"
import { getAdminPayments } from "@/api"
import { getAdminPaymentsQueryKey } from "@/api/@tanstack/react-query.gen"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { paymentStatusMap } from "@/lib/payment"
import { useProviderMap } from "@/hooks/use-provider-map"

export function PaymentsTab({ userId }: { userId: number }) {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const providerMap = useProviderMap("payment")

  const fetchPayments = useCallback(async ({ page, pageSize, sorting }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "amount" | "created_at" | "paid_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
    const { data: res } = await getAdminPayments({
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
  const table = useDataTable<PaymentAdminPaymentItem>({
    fetchFn: fetchPayments,
    queryKey: getAdminPaymentsQueryKey({ query: { user_id: userId } }),
    syncUrl: false,
  })

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
