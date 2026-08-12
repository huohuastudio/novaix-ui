import { useCallback, useMemo, useState } from "react"
import { Routes, Route } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, X, FileText, Loader2, Receipt } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getAdminInvoices,
  postAdminInvoicesByIdApprove,
  postAdminInvoicesByIdReject,
  postAdminInvoicesByIdIssue,
} from "@/api"
import type { InvoiceInvoiceItem } from "@/api"
import {
  getAdminInvoicesQueryKey,
  getAdminInvoicesStatsQueryKey,
  getAdminInvoicesStatsOptions,
} from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate, useFormatAmount } from "@/hooks/use-site-settings"
import { UserPopover } from "@/components/user-popover"
import { getErrorMessage } from "@/lib/utils"

// 状态映射
const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待审核", variant: "outline" },
  approved: { label: "待开票", variant: "default" },
  issued: { label: "已开票", variant: "secondary" },
  rejected: { label: "已驳回", variant: "destructive" },
}


// 统计卡片区域
function StatsSection() {
  const formatAmount = useFormatAmount()
  const { data, isLoading } = useQuery({
    ...getAdminInvoicesStatsOptions(),
  })
  const stats = data?.data

  const cards = [
    { label: "待审核", value: stats?.pending_count ?? 0, format: false },
    { label: "已审核", value: stats?.approved_count ?? 0, format: false },
    { label: "已开票", value: stats?.issued_count ?? 0, format: false },
    { label: "累计开票金额", value: stats?.total_issued ?? 0, format: true },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-semibold">
              {card.format ? formatAmount(card.value) : card.value}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// 驳回弹窗
function RejectDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceInvoiceItem | null
  onSuccess: () => void
}) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("请输入驳回原因")
      return
    }
    setLoading(true)
    try {
      await postAdminInvoicesByIdReject({
        path: { id: invoice!.id! },
        body: { reason: reason.trim() },
      })
      toast.success("已驳回")
      setReason("")
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "驳回失败"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason("")
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>驳回发票申请</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            发票编号：{invoice?.invoice_no}，抬头：{invoice?.title}
          </p>
          <div className="space-y-2">
            <Label>驳回原因 *</Label>
            <Textarea
              placeholder="请输入驳回原因"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            确认驳回
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 开票弹窗
function IssueDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceInvoiceItem | null
  onSuccess: () => void
}) {
  const formatAmount = useFormatAmount()
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [remark, setRemark] = useState("")
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setInvoiceNumber("")
    setFileUrl("")
    setRemark("")
  }

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      toast.error("请输入发票号码")
      return
    }
    if (!fileUrl.trim()) {
      toast.error("请输入发票文件地址")
      return
    }
    setLoading(true)
    try {
      await postAdminInvoicesByIdIssue({
        path: { id: invoice!.id! },
        body: {
          invoice_number: invoiceNumber.trim(),
          invoice_file_url: fileUrl.trim(),
          admin_remark: remark.trim() || undefined,
        },
      })
      toast.success("开票成功")
      resetForm()
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "开票失败"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>开具发票</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            发票编号：{invoice?.invoice_no}，抬头：{invoice?.title}，金额：{formatAmount(invoice?.amount ?? 0)}
          </p>
          <div className="space-y-2">
            <Label>发票号码 *</Label>
            <Input
              placeholder="请输入发票号码"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>发票文件地址 *</Label>
            <Input
              placeholder="请输入发票文件 URL"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              placeholder="选填，管理员备注"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            确认开票
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InvoiceList() {
  useBreadcrumb([{ label: "发票管理" }])
  const formatDate = useFormatDate()
  const formatAmount = useFormatAmount()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  // 弹窗状态
  const [rejectInvoice, setRejectInvoice] = useState<InvoiceInvoiceItem | null>(null)
  const [issueInvoice, setIssueInvoice] = useState<InvoiceInvoiceItem | null>(null)

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "amount" | "status" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0]
      ? sorting[0].desc ? "desc" : "asc"
      : undefined

    const { data: res } = await getAdminInvoices({
      query: {
        page,
        page_size: pageSize,
        status: (filters.status as "pending" | "approved" | "issued" | "rejected") || undefined,
        keyword: (filters.invoice_no as string) || undefined,
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
    fetchFn: fetchData,
    queryKey: getAdminInvoicesQueryKey(),
    filterKeys: ["invoice_no", "status"],
  })

  // 失效缓存
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getAdminInvoicesQueryKey() })
    queryClient.invalidateQueries({ queryKey: getAdminInvoicesStatsQueryKey() })
  }, [queryClient])

  // 审核通过
  const handleApprove = useCallback(async (item: InvoiceInvoiceItem) => {
    const ok = await confirm({
      title: "审核通过",
      description: `确定要通过发票申请「${item.invoice_no}」（${item.title}）吗？`,
      confirmText: "通过",
    })
    if (!ok) return
    try {
      await postAdminInvoicesByIdApprove({ path: { id: item.id! } })
      toast.success("审核已通过")
      invalidateAll()
    } catch (err) {
      toast.error(getErrorMessage(err, "审核失败"))
    }
  }, [confirm, invalidateAll])

  const columns: ColumnDef<InvoiceInvoiceItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "invoice_no",
      header: "发票编号",
      meta: {
        filterVariant: "text" as const,
        filterPlaceholder: "搜索编号/抬头...",
      },
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.invoice_no}</span>
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
      accessorKey: "title",
      header: "抬头",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.title}>
          {row.original.title}
        </div>
      ),
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
          { label: "待审核", value: "pending" },
          { label: "待开票", value: "approved" },
          { label: "已开票", value: "issued" },
          { label: "已驳回", value: "rejected" },
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
      accessorKey: "created_at",
      header: "申请时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1 h-8">
            {/* 待审核：审核通过 + 驳回 */}
            {item.status === "pending" && (
              <>
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
                  <TooltipContent>审核通过</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setRejectInvoice(item)}
                    >
                      <X className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>驳回</TooltipContent>
                </Tooltip>
              </>
            )}
            {/* 待开票：开票 */}
            {item.status === "approved" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setIssueInvoice(item)}
                  >
                    <FileText className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>开票</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ], [handleApprove, formatDate, formatAmount])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">发票管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">审核和管理用户发票申请</p>
      </div>

      {/* 统计卡片 */}
      <StatsSection />

      {/* 数据表格 */}
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
        emptyIcon={Receipt}
        emptyTitle="暂无发票申请"
        emptyDescription="用户提交发票申请后将显示在这里"
      />

      {/* 驳回弹窗 */}
      <RejectDialog
        open={!!rejectInvoice}
        onOpenChange={(open) => !open && setRejectInvoice(null)}
        invoice={rejectInvoice}
        onSuccess={() => {
          setRejectInvoice(null)
          invalidateAll()
        }}
      />

      {/* 开票弹窗 */}
      <IssueDialog
        open={!!issueInvoice}
        onOpenChange={(open) => !open && setIssueInvoice(null)}
        invoice={issueInvoice}
        onSuccess={() => {
          setIssueInvoice(null)
          invalidateAll()
        }}
      />

      {ConfirmDialog}
    </div>
  )
}

export default function Invoices() {
  return (
    <Routes>
      <Route index element={<InvoiceList />} />
    </Routes>
  )
}
