import { useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Check, X, ArrowLeftRight } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  getAdminPushTransfers,
  postAdminPushTransfersByIdApprove,
  postAdminPushTransfersByIdReject,
} from "@/api"
import type { AdminAdminPushTransferResponse } from "@/api"
import { getAdminPushTransfersQueryKey } from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate, useFormatAmount } from "@/hooks/use-site-settings"
import { UserPopover } from "@/components/user-popover"
import { getErrorMessage } from "@/lib/utils"

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待接收", variant: "outline" },
  pending_approval: { label: "待审批", variant: "default" },
  accepted: { label: "已完成", variant: "secondary" },
  cancelled: { label: "已取消", variant: "secondary" },
  rejected: { label: "已拒绝", variant: "destructive" },
  expired: { label: "已过期", variant: "secondary" },
}

export default function AdminPushTransfers() {
  useBreadcrumb([{ label: "转移管理" }])
  const formatDate = useFormatDate()
  const formatAmount = useFormatAmount()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminPushTransfers({
      query: {
        page,
        page_size: pageSize,
        status: (filters.status as string) || undefined,
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
    fetchFn: fetchData,
    queryKey: getAdminPushTransfersQueryKey(),
    filterKeys: ["status"],
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getAdminPushTransfersQueryKey() })
  }, [queryClient])

  const handleApprove = useCallback(async (item: AdminAdminPushTransferResponse) => {
    const ok = await confirm({
      title: "审批通过",
      description: `确定通过转移请求 #${item.id}（转移码：${item.code}）？实例将转移给接收方。`,
      confirmText: "通过",
    })
    if (!ok) return
    try {
      await postAdminPushTransfersByIdApprove({ path: { id: item.id! } })
      toast.success("审批已通过，实例已转移")
      invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, "审批失败"))
    }
  }, [confirm, invalidate])

  const handleReject = useCallback(async (item: AdminAdminPushTransferResponse) => {
    const ok = await confirm({
      title: "拒绝转移",
      description: `确定拒绝转移请求 #${item.id}？已扣的手续费将退还。`,
      confirmText: "拒绝",
      destructive: true,
    })
    if (!ok) return
    try {
      await postAdminPushTransfersByIdReject({ path: { id: item.id! } })
      toast.success("已拒绝转移请求")
      invalidate()
    } catch (err) {
      toast.error(getErrorMessage(err, "拒绝失败"))
    }
  }, [confirm, invalidate])

  const columns: ColumnDef<AdminAdminPushTransferResponse>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "code",
      header: "转移码",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "sender_id",
      header: "发起方",
      cell: ({ row }) => (
        <UserPopover userId={row.original.sender_id} />
      ),
    },
    {
      accessorKey: "receiver_id",
      header: "接收方",
      cell: ({ row }) =>
        row.original.receiver_id ? (
          <UserPopover userId={row.original.receiver_id} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "instance_id",
      header: "实例 ID",
    },
    {
      accessorKey: "status",
      header: "状态",
      meta: {
        filterVariant: "select" as const,
        filterPlaceholder: "状态",
        filterOptions: [
          { label: "待接收", value: "pending" },
          { label: "待审批", value: "pending_approval" },
          { label: "已完成", value: "accepted" },
          { label: "已取消", value: "cancelled" },
          { label: "已拒绝", value: "rejected" },
          { label: "已过期", value: "expired" },
        ],
      },
      cell: ({ row }) => {
        const cfg = statusMap[row.original.status ?? ""]
        return cfg ? (
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        ) : (
          row.original.status
        )
      },
    },
    {
      accessorKey: "fee_amount",
      header: "手续费",
      cell: ({ row }) => {
        const amt = row.original.fee_amount
        if (!amt) return <span className="text-muted-foreground">-</span>
        return (
          <span>
            {formatAmount(amt)}
            {row.original.fee_refunded && (
              <span className="ml-1 text-xs text-muted-foreground">（已退）</span>
            )}
          </span>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original
        if (item.status !== "pending_approval") return null
        return (
          <div className="flex items-center gap-1 h-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => handleApprove(item)}
                >
                  <Check className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>通过</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleReject(item)}
                >
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>拒绝</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ], [handleApprove, handleReject, formatDate, formatAmount])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">转移管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看和审批实例转移请求</p>
      </div>

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
        emptyIcon={ArrowLeftRight}
        emptyTitle="暂无转移记录"
        emptyDescription="用户发起实例转移后将显示在这里"
      />

      {ConfirmDialog}
    </div>
  )
}
