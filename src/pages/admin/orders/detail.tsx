import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  CreditCard,
  XCircle,
  Undo2,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Globe,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAdminOrdersById,
  postAdminOrdersByIdPay,
  postAdminOrdersByIdCancel,
  postAdminOrdersByIdRefundReject,
} from "@/api"
import type { OrderOrderDetail, OrderOrderDetailTransaction } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMemory, getErrorMessage} from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { orderStatusMap, orderTypeMap, billingCycleMap, planTypeMap, txTypeMap, refundStatusMap } from "@/lib/order-constants"
import { useFormatAmount, useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { statusMap as instanceStatusMap } from "@/lib/instance-constants"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { RefundDialog } from "./refund-dialog"

function DetailSkeleton() {
  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const adminPath = useAdminPath()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const [order, setOrder] = useState<OrderOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refundOpen, setRefundOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  useBreadcrumb([
    { label: "订单管理", href: `${adminPath}/orders` },
    { label: order ? `#${order.order_no}` : "详情" },
  ])

  const fetchOrder = useCallback(async () => {
    if (!id) return
    try {
      const { data: res } = await getAdminOrdersById({ path: { id: Number(id) } })
      if (res?.data) setOrder(res.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const handlePay = useCallback(async () => {
    if (!order) return
    const ok = await confirm({
      title: "支付订单",
      description: `确定要使用用户余额支付订单「${order.order_no}」（${formatAmount(order.amount)}）吗？`,
      confirmText: "确认支付",
    })
    if (!ok) return
    try {
      await postAdminOrdersByIdPay({ path: { id: order.id! } })
      toast.success("支付成功")
      fetchOrder()
    } catch (err) {
      toast.error(getErrorMessage(err, "支付失败"))
    }
  }, [order, confirm, fetchOrder, formatAmount])

  const handleCancel = useCallback(async () => {
    if (!order) return
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
      fetchOrder()
    } catch (err) {
      toast.error(getErrorMessage(err, "取消失败"))
    }
  }, [order, confirm, fetchOrder])

  const handleRefund = useCallback(() => {
    setRefundOpen(true)
  }, [])

  const handleReject = async () => {
    if (!order?.id || !rejectReason.trim()) return
    setRejectLoading(true)
    try {
      const { data: res } = await postAdminOrdersByIdRefundReject({
        path: { id: order.id },
        body: { reason: rejectReason },
      })
      if (res?.code === 0) {
        toast.success("退款申请已拒绝")
        setRejectOpen(false)
        setRejectReason('')
        fetchOrder()
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setRejectLoading(false)
    }
  }

  const status = useMemo(() => orderStatusMap[order?.status ?? ""], [order?.status])
  const refundStatus = order?.refund_status
  const snap = order?.plan_snapshot

  if (loading) return <DetailSkeleton />

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-muted-foreground">订单不存在</p>
        <Button variant="outline" onClick={() => navigate(`${adminPath}/orders`)}>返回列表</Button>
      </div>
    )
  }

  return (
    <div className="px-6 pt-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`${adminPath}/orders`)}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold font-mono">{order.order_no}</h1>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {order.status === "pending" && (
            <>
              <Button onClick={handlePay}>
                <CreditCard className="size-4" />
                支付
              </Button>
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleCancel}>
                <XCircle className="size-4" />
                取消
              </Button>
            </>
          )}
          {order.status === "paid" && refundStatus === "pending" && (
            <>
              <Button onClick={handleRefund}>
                <Undo2 className="size-4" />
                批准退款
              </Button>
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="size-4" />
                拒绝退款
              </Button>
            </>
          )}
          {order.status === "paid" && (!refundStatus || refundStatus === "") && (
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleRefund}>
              <Undo2 className="size-4" />
              退款
            </Button>
          )}
        </div>
      </div>

      {/* 订单基本信息 */}
      <section>
        <h3 className="text-sm font-medium mb-3">订单信息</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
          <KV label="订单号"><span className="font-mono text-xs">{order.order_no}</span></KV>
          <KV label="类型">{orderTypeMap[order.type ?? ""] ?? order.type}</KV>
          <KV label="计费周期">{billingCycleMap[order.billing_cycle ?? ""] ?? order.billing_cycle ?? "-"}</KV>
          <KV label="金额"><span className="text-base font-semibold">{formatAmount(order.amount)}</span></KV>
          <KV label="用户">
            <Link to={`${adminPath}/users`} className="text-primary hover:underline">
              {order.username}
            </Link>
            <span className="text-muted-foreground text-xs ml-1">(ID: {order.user_id})</span>
          </KV>
          <KV label="关联实例">
            {order.instance ? (
              <Link to={`${adminPath}/instances/${order.instance.id}`} className="text-primary hover:underline">
                {order.instance.name}
                {instanceStatusMap[order.instance.status ?? ""] && (
                  <Badge variant={instanceStatusMap[order.instance.status!].variant} className="ml-1.5 text-[10px] px-1 py-0">
                    {instanceStatusMap[order.instance.status!].label}
                  </Badge>
                )}
              </Link>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </KV>
          <KV label="周期开始">{formatDate(order.period_start)}</KV>
          <KV label="周期结束">{formatDate(order.period_end)}</KV>
          <KV label="支付时间">{formatDate(order.paid_at)}</KV>
          <KV label="创建时间">{formatDate(order.created_at)}</KV>
          <KV label="更新时间">{formatDate(order.updated_at)}</KV>
          {order.remark && <KV label="备注">{order.remark}</KV>}
          {refundStatus && refundStatus !== "" && (
            <KV label="退款状态">
              <span className={refundStatusMap[refundStatus]?.color ?? ""}>
                {refundStatusMap[refundStatus]?.label ?? refundStatus}
              </span>
            </KV>
          )}
          {order.refund_reason && <KV label="退款原因">{order.refund_reason}</KV>}
          {refundStatus === "rejected" && order.refund_rejected_reason && (
            <KV label="拒绝原因">{order.refund_rejected_reason}</KV>
          )}
          {order.refund_requested_at && (
            <KV label="退款申请时间">{formatDate(order.refund_requested_at)}</KV>
          )}
        </dl>
      </section>

      {/* 套餐快照 */}
      {snap && snap.name && (
        <>
          <Separator />
          <section>
            <h3 className="text-sm font-medium mb-1">套餐快照</h3>
            <p className="text-xs text-muted-foreground mb-3">下单时的套餐配置，不受后续套餐修改影响</p>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
              <KV label="套餐名称">{snap.name}</KV>
              <KV label="类型">{planTypeMap[snap.type ?? ""] ?? snap.type}</KV>
              <KV label="架构">{snap.arch}</KV>
              <KV label="IP 数量">{snap.ip_count}</KV>
            </dl>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Cpu className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">CPU</div>
                  <div className="text-sm font-medium">{snap.cpu} 核</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <MemoryStick className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">内存</div>
                  <div className="text-sm font-medium">{formatMemory(snap.memory ?? 0)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <HardDrive className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">磁盘</div>
                  <div className="text-sm font-medium">{snap.disk} GB</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Wifi className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">带宽</div>
                  <div className="text-sm font-medium">{snap.bandwidth ? `${snap.bandwidth} Mbps` : "不限"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Globe className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">月流量</div>
                  <div className="text-sm font-medium">{snap.traffic ? `${snap.traffic} GB` : "不限"}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 max-w-md">
              <div className="rounded-md border px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground">月付</div>
                <div className="text-sm font-medium">{formatAmount(snap.price_monthly)}</div>
              </div>
              <div className="rounded-md border px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground">季付</div>
                <div className="text-sm font-medium">{formatAmount(snap.price_quarterly)}</div>
              </div>
              <div className="rounded-md border px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground">年付</div>
                <div className="text-sm font-medium">{formatAmount(snap.price_yearly)}</div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* 交易记录 */}
      {order.transactions && order.transactions.length > 0 && (
        <>
          <Separator />
          <section>
            <h3 className="text-sm font-medium mb-3">关联交易</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-20">类型</TableHead>
                    <TableHead className="w-28">变动金额</TableHead>
                    <TableHead className="w-28">变动后余额</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className="w-40">时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.transactions.map((tx: OrderOrderDetailTransaction) => {
                    const txType = txTypeMap[tx.type ?? ""]
                    const amountColor = (tx.amount ?? 0) > 0 ? "text-green-600" : (tx.amount ?? 0) < 0 ? "text-red-600" : ""
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                        <TableCell>
                          {txType ? <Badge variant={txType.variant}>{txType.label}</Badge> : tx.type}
                        </TableCell>
                        <TableCell className={`font-medium ${amountColor}`}>{formatAmount(tx.amount)}</TableCell>
                        <TableCell>{formatAmount(tx.balance)}</TableCell>
                        <TableCell className="text-muted-foreground">{tx.remark || "-"}</TableCell>
                        <TableCell>{formatDate(tx.created_at)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      <RefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        order={order}
        onSuccess={() => { setRefundOpen(false); fetchOrder() }}
      />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>拒绝退款</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>拒绝原因</Label>
              <Textarea
                placeholder="请填写拒绝退款的原因"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectLoading || !rejectReason.trim()}
            >
              {rejectLoading && <Loader2 className="size-4 animate-spin" />}
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  )
}
