import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { RotateCcw, XCircle, CreditCard, Undo2, Plus, ShoppingCart, X, CheckCheck, Ban } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getAdminOrders,
  getAdminTransactions,
  postAdminOrdersByIdPay,
  postAdminOrdersByIdCancel,
  postAdminOrdersBatchRefund,
  postAdminOrdersBatchRefundReject,
} from "@/api"
import type { OrderOrderItem, OrderTransactionItem, OrderBatchRefundResponse } from "@/api"
import { getAdminOrdersQueryKey, getAdminTransactionsQueryKey } from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { orderStatusMap, orderTypeMap, billingCycleMap, txTypeMap, refundStatusMap } from "@/lib/order-constants"
import { ExportButton } from "@/components/export-button"
import { useFormatAmount, useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { UserPopover } from "@/components/user-popover"
import { OrderPopover } from "@/components/order-popover"
import CreateOrderSheet from "./create-order-sheet"
import { RefundDialog } from "./refund-dialog"
import OrderDetail from "./detail"
import { getErrorMessage } from "@/lib/utils"

function OrderList() {
  const navigate = useNavigate()
  const adminPath = useAdminPath()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [refundOrder, setRefundOrder] = useState<OrderOrderItem | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [batchLoading, setBatchLoading] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchOrders = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "amount" | "status" | "type" | "created_at" | "paid_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminOrders({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.order_no as string) || undefined,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        status: (filters.status as "pending" | "paid" | "cancelled" | "refunded") || undefined,
        type: (filters.type as "new" | "renew" | "upgrade") || undefined,
        billing_cycle: (filters.billing_cycle as "hourly" | "monthly" | "quarterly" | "yearly") || undefined,
        refund_status: (filters.refund_status as "pending" | "approved" | "rejected") || undefined,
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
    fetchFn: fetchOrders,
    queryKey: getAdminOrdersQueryKey(),
    filterKeys: ["order_no", "status", "type", "billing_cycle", "refund_status"],
  })

  const handlePay = useCallback(async (order: OrderOrderItem) => {
    const ok = await confirm({
      title: "支付订单",
      description: `确定要使用用户余额支付订单「${order.order_no}」（${formatAmount(order.amount)}）吗？`,
      confirmText: "确认支付",
    })
    if (!ok) return
    try {
      await postAdminOrdersByIdPay({ path: { id: order.id! } })
      toast.success("支付成功")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "支付失败"))
    }
  }, [table, confirm, formatAmount])

  const handleCancel = useCallback(async (order: OrderOrderItem) => {
    const ok = await confirm({
      title: "取消订单",
      description: `确定要取消订单「${order.order_no}」吗？`,
      confirmText: "取消订单",
      destructive: true,
    })
    if (!ok) return
    try {
      await postAdminOrdersByIdCancel({ path: { id: order.id! } })
      toast.success("订单已取消")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "取消失败"))
    }
  }, [table, confirm])

  const handleRefund = useCallback((order: OrderOrderItem) => {
    setRefundOrder(order)
  }, [])

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).map(Number),
    [rowSelection],
  )

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 分页/筛选/排序变化时清除选中状态
  useEffect(() => { setRowSelection({}) }, [table.pagination, table.columnFilters, table.sorting])

  const executeBatchAction = useCallback(async (
    apiFn: () => Promise<{ data?: { code?: number; message?: string; data?: OrderBatchRefundResponse } }>,
    label: string,
  ) => {
    setBatchLoading(true)
    try {
      const { data: res } = await apiFn()
      if (res?.code !== 0) {
        toast.error(res?.message ?? "操作失败")
        return
      }
      const result = res.data as OrderBatchRefundResponse
      if (result.failed === 0) {
        toast.success(`批量${label}完成，共 ${result.total} 个订单`)
      } else if (result.success === 0) {
        toast.error(`批量${label}失败，${result.failed} 个订单操作失败`)
      } else {
        toast.warning(`批量${label}：${result.success} 个成功，${result.failed} 个失败`)
      }
      setRowSelection({})
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setBatchLoading(false)
    }
  }, [table])

  const handleBatchRefund = useCallback(async () => {
    const ok = await confirm({
      title: "批量退款",
      description: `确定要批量退款 ${selectedIds.length} 个订单吗？退款金额将退回到用户余额。`,
      confirmText: "确认退款",
      destructive: true,
    })
    if (!ok) return
    executeBatchAction(() => postAdminOrdersBatchRefund({ body: { ids: selectedIds } }), "退款")
  }, [selectedIds, confirm, executeBatchAction])

  const rejectReasonRef = useRef("")

  const handleBatchReject = useCallback(async () => {
    rejectReasonRef.current = ""
    const ok = await confirm({
      title: "批量拒绝退款",
      description: (
        <div className="space-y-3">
          <p>确定要批量拒绝 {selectedIds.length} 个订单的退款申请吗？</p>
          <Textarea
            placeholder="请输入拒绝原因"
            rows={2}
            onChange={(e) => { rejectReasonRef.current = e.target.value }}
          />
        </div>
      ),
      confirmText: "确认拒绝",
      destructive: true,
    })
    if (!ok) return
    const reason = rejectReasonRef.current.trim() || "批量拒绝"
    executeBatchAction(() => postAdminOrdersBatchRefundReject({ body: { ids: selectedIds, reason } }), "拒绝退款")
  }, [selectedIds, confirm, executeBatchAction])

  const batchToolbar = selectedIds.length > 0 ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        已选 {selectedIds.length} 项
      </span>
      <Button size="sm" variant="outline" disabled={batchLoading} onClick={handleBatchRefund}>
        <CheckCheck className="size-4" />
        批量退款
      </Button>
      <Button size="sm" variant="outline" disabled={batchLoading} onClick={handleBatchReject}>
        <Ban className="size-4" />
        批量拒绝
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setRowSelection({})}>
        <X className="size-4" />
      </Button>
    </div>
  ) : undefined

  const columns: ColumnDef<OrderOrderItem>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "order_no",
      header: "订单号",
      meta: {
        filterVariant: "text" as const,
        filterPlaceholder: "搜索订单号/用户名...",
      },
      cell: ({ row }) => (
        <button
          className="font-mono text-xs text-primary hover:underline"
          onClick={() => navigate(`${adminPath}/orders/${row.original.id}`)}
        >
          {row.original.order_no}
        </button>
      ),
    },
    {
      accessorKey: "username",
      header: "用户",
      cell: ({ row }) => (
        <UserPopover userId={row.original.user_id} username={row.original.username} />
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      meta: {
        filterVariant: "select" as const,
        filterPlaceholder: "类型",
        filterOptions: [
          { label: "新购", value: "new" },
          { label: "续费", value: "renew" },
          { label: "升级", value: "upgrade" },
        ],
      },
      cell: ({ row }) => orderTypeMap[row.original.type ?? ""] ?? row.original.type,
    },
    {
      accessorKey: "plan_name",
      header: "套餐",
      cell: ({ row }) => row.original.plan_name || <span className="text-muted-foreground">-</span>,
    },
    {
      id: "billing_cycle",
      header: "周期",
      meta: {
        filterVariant: "select" as const,
        filterPlaceholder: "周期",
        filterOptions: [
          { label: "时付", value: "hourly" },
          { label: "月付", value: "monthly" },
          { label: "季付", value: "quarterly" },
          { label: "年付", value: "yearly" },
        ],
      },
      cell: ({ row }) => billingCycleMap[row.original.billing_cycle ?? ""] ?? <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "amount",
      header: "金额",
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-medium">{formatAmount(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: true,
      meta: {
        filterVariant: "select" as const,
        filterPlaceholder: "状态",
        filterOptions: [
          { label: "待支付", value: "pending" },
          { label: "已支付", value: "paid" },
          { label: "已取消", value: "cancelled" },
          { label: "已退款", value: "refunded" },
        ],
      },
      cell: ({ row }) => {
        const status = orderStatusMap[row.original.status ?? ""]
        return status ? (
          <Badge variant={status.variant}>{status.label}</Badge>
        ) : row.original.status
      },
    },
    {
      accessorKey: "refund_status",
      header: "退款",
      meta: {
        filterVariant: "select" as const,
        filterPlaceholder: "退款状态",
        filterOptions: [
          { label: "待审核", value: "pending" },
          { label: "已通过", value: "approved" },
          { label: "已拒绝", value: "rejected" },
        ],
      },
      cell: ({ row }) => {
        const rs = row.original.refund_status
        if (!rs) return <span className="text-muted-foreground">-</span>
        const cfg = refundStatusMap[rs]
        return cfg ? <Badge variant={cfg.variant}>{cfg.label}</Badge> : rs
      },
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const order = row.original
        return (
          <div className="flex items-center gap-1 h-8">
            {order.status === "pending" && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => handlePay(order)}>
                      <CreditCard className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>支付</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleCancel(order)}>
                      <XCircle className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>取消</TooltipContent>
                </Tooltip>
              </>
            )}
            {order.status === "paid" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleRefund(order)}>
                    <Undo2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>退款</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ], [handlePay, handleCancel, handleRefund, formatAmount, formatDate, navigate, adminPath])

  return (
    <>
      <DataTable
        tourId="order-table"
        columns={columns}
        data={table.data}
        loading={table.loading}
        fetching={table.fetching}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        getRowId={(row) => String(row.id)}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        toolbar={batchToolbar ?? (
          <div className="flex gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              新购下单
            </Button>
            <ExportButton endpoint="orders" disabled={table.data.total === 0} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={ShoppingCart}
            title="暂无订单"
            description="用户购买套餐后订单会自动创建"
          />
        }
      />
      <CreateOrderSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => { setCreateOpen(false); table.refresh() }}
      />
      <RefundDialog
        open={!!refundOrder}
        onOpenChange={(open) => !open && setRefundOrder(null)}
        order={refundOrder}
        onSuccess={() => { setRefundOrder(null); table.refresh() }}
      />
      {ConfirmDialog}
    </>
  )
}

function TransactionList() {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const fetchTransactions = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminTransactions({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.username as string) || undefined,
        user_id: filters.user_id ? Number(filters.user_id) : undefined,
        type: (filters.type as "recharge" | "payment" | "refund" | "admin" | "addon_ip" | "traffic_overage" | "traffic_package" | "hourly_deduction" | "commission" | "distribution") || undefined,
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
    fetchFn: fetchTransactions,
    queryKey: getAdminTransactionsQueryKey(),
    filterKeys: ["username", "type"],
  })

  const columns: ColumnDef<OrderTransactionItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "username",
      header: "用户",
      meta: {
        filterVariant: "text" as const,
        filterPlaceholder: "搜索用户名/备注...",
      },
      cell: ({ row }) => (
        <UserPopover userId={row.original.user_id} username={row.original.username} />
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      meta: {
        filterVariant: "select" as const,
        filterPlaceholder: "类型",
        filterOptions: [
          { label: "充值", value: "recharge" },
          { label: "支付", value: "payment" },
          { label: "退款", value: "refund" },
          { label: "调账", value: "admin" },
          { label: "附加 IP", value: "addon_ip" },
          { label: "流量超额", value: "traffic_overage" },
          { label: "流量包", value: "traffic_package" },
          { label: "按时扣费", value: "hourly_deduction" },
          { label: "返佣", value: "commission" },
          { label: "分销拿货", value: "distribution" },
          { label: "换 IP", value: "change_ip" },
        ],
      },
      cell: ({ row }) => {
        const tx = txTypeMap[row.original.type ?? ""]
        return tx ? <Badge variant={tx.variant}>{tx.label}</Badge> : row.original.type
      },
    },
    {
      accessorKey: "amount",
      header: "变动金额",
      cell: ({ row }) => {
        const amount = row.original.amount ?? 0
        const color = amount > 0 ? "text-green-600" : amount < 0 ? "text-red-600" : ""
        return <span className={`font-medium ${color}`}>{formatAmount(amount)}</span>
      },
    },
    {
      accessorKey: "balance",
      header: "变动后余额",
      cell: ({ row }) => formatAmount(row.original.balance),
    },
    {
      accessorKey: "order_id",
      header: "关联订单",
      cell: ({ row }) => <OrderPopover orderId={row.original.order_id} />,
    },
    {
      accessorKey: "remark",
      header: "备注",
      cell: ({ row }) => row.original.remark || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "created_at",
      header: "时间",
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
      pagination={table.pagination}
      onPaginationChange={table.setPagination}
      sorting={table.sorting}
      onSortingChange={table.setSorting}
      columnFilters={table.columnFilters}
      onColumnFiltersChange={table.setColumnFilters}
      toolbar={
        <Button variant="outline" onClick={table.refresh}>
          <RotateCcw className="size-4" />
          刷新
        </Button>
      }
    />
  )
}

function OrderListPage() {
  useBreadcrumb([{ label: "订单管理" }])
  const [tab, setTab] = useState("orders")

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">订单管理</h1>
            <HelpLink path="/novaix/order" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">查看和管理所有订单与交易流水</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-tour="order-tabs">
            <TabsTrigger value="orders">订单列表</TabsTrigger>
            <TabsTrigger value="transactions">交易流水</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "orders" ? <OrderList /> : <TransactionList />}
    </div>
  )
}

export default function Orders() {
  return (
    <Routes>
      <Route index element={<OrderListPage />} />
      <Route path=":id" element={<OrderDetail />} />
    </Routes>
  )
}
