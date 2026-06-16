import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Cpu,
  MemoryStick,
  HardDrive,
  Globe,
  Loader2,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getPortalOrdersById,
  postPortalOrdersByIdCancel,
  postPortalOrdersByIdRefund,
} from '@/api'
import { PayDialog } from './pay-dialog'
import type { PortalPortalOrderDetail } from '@/api'
import { useSiteName, useFormatAmount } from '@/hooks/use-site-settings'
import { formatMemory, getErrorMessage } from '@/lib/utils'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { orderStatusMap, orderTypeMap, billingCycleMap, refundStatusMap } from '@/lib/order-constants'

const statusColors: Record<string, { dot: string; text: string }> = {
  pending: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  paid: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  cancelled: { dot: 'bg-zinc-300 dark:bg-zinc-600', text: 'text-zinc-400 dark:text-zinc-500' },
  refunded: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
}

const fulfillmentMap: Record<string, string> = {
  '': '—',
  provisioning: '开通中',
  completed: '已完成',
  failed: '开通失败',
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-[13px] font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <div className="rounded-2xl bg-background">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between px-5 py-3.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PortalOrderDetail() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<PortalPortalOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<'cancel' | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundLoading, setRefundLoading] = useState(false)

  useDocumentTitle(`订单详情 - ${siteName}`)

  const fetchOrder = useCallback(async () => {
    if (!id) return
    try {
      const { data: res } = await getPortalOrdersById({ path: { id: Number(id) } })
      if (res?.code === 0 && res.data) {
        setOrder(res.data as PortalPortalOrderDetail)
      } else {
        navigate('/portal/orders', { replace: true })
      }
    } catch {
      navigate('/portal/orders', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    fetchOrder()
  }, [fetchOrder])

  const handleCancel = async () => {
    if (!order?.id) return
    setActionLoading(true)
    try {
      const { data: res } = await postPortalOrdersByIdCancel({ path: { id: order.id } })
      if (res?.code === 0) {
        toast.success('订单已取消')
        fetchOrder()
      } else {
        toast.error(res?.message || '取消失败')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, '取消失败'))
    } finally {
      setActionLoading(false)
      setConfirmDialog(null)
    }
  }

  const handleRefund = async () => {
    if (!order?.id || !refundReason.trim()) return
    setRefundLoading(true)
    try {
      const { data: res } = await postPortalOrdersByIdRefund({
        path: { id: order.id },
        body: { reason: refundReason },
      })
      if (res?.code === 0) {
        toast.success('退款申请已提交，请等待审核')
        setRefundOpen(false)
        setRefundReason('')
        fetchOrder()
      } else {
        toast.error(res?.message || '提交失败')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, '提交退款申请失败'))
    } finally {
      setRefundLoading(false)
    }
  }

  if (loading) return <DetailSkeleton />
  if (!order) return null

  const status = order.status ?? ''
  const colors = statusColors[status] ?? { dot: 'bg-zinc-400', text: 'text-zinc-400' }
  const snap = order.plan_snapshot
  const refundStatus = order.refund_status
  const canRequestRefund = status === 'paid' && (!refundStatus || refundStatus === '' || refundStatus === 'rejected')
  const refundCfg = refundStatus ? refundStatusMap[refundStatus] : null

  return (
    <>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
              <Link to="/portal/orders">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight">
                  {order.plan_name || '订单详情'}
                </h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
                  <span className={`size-1.5 rounded-full ${colors.dot}`} />
                  {orderStatusMap[status]?.label ?? status}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5 font-mono">
                {order.order_no}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-11 sm:ml-0">
            {status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDialog('cancel')}
                  disabled={actionLoading}
                >
                  取消订单
                </Button>
                <Button
                  onClick={() => setPayOpen(true)}
                >
                  立即支付
                </Button>
              </>
            )}
            {canRequestRefund && (
              <Button
                variant="outline"
                onClick={() => setRefundOpen(true)}
              >
                申请退款
              </Button>
            )}
          </div>
        </div>

        {/* 退款状态提示 */}
        {refundCfg && (
          <div className="rounded-2xl bg-background p-5">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${refundCfg.color}`}>{refundCfg.label}</span>
            </div>
            {order.refund_reason && (
              <p className="text-[13px] text-muted-foreground mt-2">
                退款原因：{order.refund_reason}
              </p>
            )}
            {refundStatus === 'rejected' && order.refund_rejected_reason && (
              <p className="text-[13px] text-red-600 dark:text-red-400 mt-1">
                拒绝原因：{order.refund_rejected_reason}
              </p>
            )}
            {order.refund_requested_at && (
              <p className="text-[12px] text-muted-foreground/70 mt-1">
                申请时间：{order.refund_requested_at}
              </p>
            )}
          </div>
        )}

        {/* 金额概览 */}
        <div className="rounded-2xl bg-background p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[13px] text-muted-foreground">订单金额</p>
              <p className="text-3xl font-semibold tracking-tight mt-1">{formatAmount(order.amount ?? 0)}</p>
            </div>
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
              <span>{orderTypeMap[order.type ?? ''] ?? order.type}</span>
              {order.billing_cycle && (
                <span>{billingCycleMap[order.billing_cycle] ?? order.billing_cycle}</span>
              )}
            </div>
          </div>
        </div>

        {/* 订单信息 */}
        <section>
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">订单信息</h2>
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            <InfoRow label="订单编号" value={order.order_no ?? ''} mono />
            <InfoRow label="订单类型" value={orderTypeMap[order.type ?? ''] ?? order.type ?? '—'} />
            <InfoRow label="计费周期" value={billingCycleMap[order.billing_cycle ?? ''] ?? order.billing_cycle ?? '—'} />
            <InfoRow label="订单状态" value={orderStatusMap[status]?.label ?? status} />
            {!!order.fulfillment_status && order.type === 'new' && (
              <InfoRow label="交付状态" value={fulfillmentMap[String(order.fulfillment_status)] ?? String(order.fulfillment_status)} />
            )}
            {order.period_start && (
              <InfoRow label="服务开始" value={order.period_start} />
            )}
            {order.period_end && (
              <InfoRow label="服务到期" value={order.period_end} />
            )}
            {order.paid_at && (
              <InfoRow label="支付时间" value={order.paid_at} />
            )}
            <InfoRow label="创建时间" value={order.created_at ?? ''} />
            {order.remark && (
              <InfoRow label="备注" value={order.remark} />
            )}
            {!!order.instance_id && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[13px] text-muted-foreground">关联云服务器</span>
                <Link
                  to={`/portal/servers/${order.instance_id}`}
                  className="text-[13px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Server className="size-3" />
                  查看详情
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 套餐配置 */}
        {snap && (
          <section>
            <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">套餐配置</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-background p-5">
                <Cpu className="size-4 text-muted-foreground mb-2" />
                <p className="text-2xl font-semibold tracking-tight">{snap.cpu ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">vCPU</p>
              </div>
              <div className="rounded-2xl bg-background p-5">
                <MemoryStick className="size-4 text-muted-foreground mb-2" />
                <p className="text-2xl font-semibold tracking-tight">{formatMemory(snap.memory ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">内存</p>
              </div>
              <div className="rounded-2xl bg-background p-5">
                <HardDrive className="size-4 text-muted-foreground mb-2" />
                <p className="text-2xl font-semibold tracking-tight">{snap.disk ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">GB 磁盘</p>
              </div>
              <div className="rounded-2xl bg-background p-5">
                <Globe className="size-4 text-muted-foreground mb-2" />
                <p className="text-2xl font-semibold tracking-tight">
                  {(snap.bandwidth ?? 0) > 0 ? snap.bandwidth : '不限'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(snap.bandwidth ?? 0) > 0 ? 'Mbps 带宽' : '带宽'}
                </p>
              </div>
            </div>
            {(snap.traffic ?? 0) > 0 && (
              <div className="rounded-2xl bg-background p-5 mt-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">每月流量</span>
                  <span className="font-medium">{snap.traffic} GB</span>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 支付弹窗 */}
      {order?.id && (
        <PayDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          orderId={order.id}
          amount={order.amount ?? 0}
          onSuccess={fetchOrder}
        />
      )}

      {/* 取消确认 */}
      <AlertDialog open={confirmDialog !== null} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消</AlertDialogTitle>
            <AlertDialogDescription>
              取消后订单将无法恢复，确认取消此订单？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 退款申请弹窗 */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>申请退款</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              退款金额 <span className="font-medium text-foreground">{formatAmount(order?.amount ?? 0)}</span> 将退回到账户余额，提交后需等待管理员审核。
            </p>
            <div className="space-y-2">
              <Label>退款原因</Label>
              <Textarea
                placeholder="请详细描述退款原因（至少 5 个字符）"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>取消</Button>
            <Button
              onClick={handleRefund}
              disabled={refundLoading || refundReason.trim().length < 5}
            >
              {refundLoading && <Loader2 className="size-4 animate-spin" />}
              提交申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
