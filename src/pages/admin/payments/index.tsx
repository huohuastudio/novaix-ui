import { useCallback, useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { ExportButton } from "@/components/export-button"
import { getAdminPayments } from "@/api"
import type { PaymentAdminPaymentItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { useProviderMap } from "@/hooks/use-provider-map"
import { paymentStatusMap } from "@/lib/payment"
import { UserPopover } from "@/components/user-popover"
import { OrderPopover } from "@/components/order-popover"

export default function Payments() {
  useBreadcrumb([{ label: "支付记录" }])

  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const providerMap = useProviderMap("payment")

  const fetchPayments = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "amount" | "status" | "provider" | "created_at" | "paid_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminPayments({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.keyword as string) || undefined,
        status: (filters.status as "pending" | "paid" | "failed" | "expired" | "cancelled") || undefined,
        provider: (filters.provider as string) || undefined,
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
    fetchFn: fetchPayments,
    filterKeys: ["keyword", "status", "provider"],
  })

  const columns = useMemo<ColumnDef<PaymentAdminPaymentItem>[]>(() => [
    {
      accessorKey: "id",
      header: "ID",
      size: 60,
      enableSorting: true,
    },
    {
      accessorKey: "keyword",
      header: "支付号",
      size: 200,
      meta: { filterVariant: "text" as const, filterPlaceholder: "搜索支付号/交易号..." },
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.payment_no}</span>
      ),
    },
    {
      accessorKey: "username",
      header: "用户",
      size: 100,
      cell: ({ row }) => (
        <UserPopover userId={row.original.user_id} username={row.original.username} />
      ),
    },
    {
      accessorKey: "provider",
      header: "渠道",
      size: 100,
      meta: {
        filterVariant: "select" as const,
        filterOptions: Object.entries(providerMap).map(([value, label]) => ({ label, value })),
      },
      cell: ({ row }) => providerMap[row.original.provider ?? ""] ?? row.original.provider,
    },
    {
      accessorKey: "amount",
      header: "金额",
      size: 100,
      enableSorting: true,
      cell: ({ row }) => formatAmount(row.original.amount ?? 0),
    },
    {
      accessorKey: "status",
      header: "状态",
      size: 100,
      meta: {
        filterVariant: "select" as const,
        filterOptions: [
          { label: "待支付", value: "pending" },
          { label: "已支付", value: "paid" },
          { label: "失败", value: "failed" },
          { label: "已过期", value: "expired" },
          { label: "已取消", value: "cancelled" },
        ],
      },
      cell: ({ row }) => {
        const s = paymentStatusMap[row.original.status ?? ""]
        return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.original.status
      },
    },
    {
      accessorKey: "order_id",
      header: "关联订单",
      size: 100,
      cell: ({ row }) => <OrderPopover orderId={row.original.order_id} />,
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      size: 160,
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: "paid_at",
      header: "支付时间",
      size: 160,
      enableSorting: true,
      cell: ({ row }) => row.original.paid_at ? formatDate(row.original.paid_at) : "-",
    },
  ], [formatAmount, formatDate, providerMap])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">支付记录</h1>
          <HelpLink path="/novaix/payment" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">查看所有在线支付记录</p>
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
          <ExportButton endpoint="payments" disabled={table.data.total === 0} />
        }
      />
    </div>
  )
}
