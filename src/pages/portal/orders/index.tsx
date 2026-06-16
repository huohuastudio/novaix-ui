import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { getPortalOrders, postPortalOrdersByIdCancel } from '@/api'
import { PayDialog } from './pay-dialog'
import type { PortalPortalOrderItem } from '@/api'
import { SimplePagination } from '@/components/simple-pagination'
import { useSiteName, useFormatAmount, useFormatDate } from '@/hooks/use-site-settings'
import { getErrorMessage } from '@/lib/utils'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { orderStatusMap, orderTypeMap, billingCycleMap } from '@/lib/order-constants'

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
]

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500',
    paid: 'bg-emerald-500',
    cancelled: 'bg-zinc-300 dark:bg-zinc-600',
    refunded: 'bg-red-500',
  }
  const textColors: Record<string, string> = {
    pending: 'text-amber-600 dark:text-amber-400',
    paid: 'text-emerald-600 dark:text-emerald-400',
    cancelled: 'text-zinc-400 dark:text-zinc-500',
    refunded: 'text-red-600 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColors[status] ?? 'text-zinc-400'}`}>
      <span className={`size-1.5 rounded-full ${colors[status] ?? 'bg-zinc-400'}`} />
      {orderStatusMap[status]?.label ?? status}
    </span>
  )
}

export default function PortalOrders() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  useDocumentTitle(`费用订单 - ${siteName}`)

  const [orders, setOrders] = useState<PortalPortalOrderItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [payOrder, setPayOrder] = useState<PortalPortalOrderItem | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    order: PortalPortalOrderItem | null
  }>({ open: false, order: null })

  const fetchOrders = useCallback(async (status: string, p: number) => {
    try {
      const { data: res } = await getPortalOrders({
        query: {
          page: p,
          page_size: pageSize,
          status: status === 'all' ? undefined : status as 'pending' | 'paid' | 'cancelled' | 'refunded',
          sort: 'created_at',
          order: 'desc',
        },
      })
      setOrders(res?.data?.items ?? [])
      setTotal(res?.data?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 筛选条件变化时重置页码
    setPage(1)
  }, [statusFilter])

  useEffect(() => {
    fetchOrders(statusFilter, page)
  }, [fetchOrders, statusFilter, page])

  const handleCancel = async () => {
    const { order } = confirmDialog
    if (!order?.id) return
    setActionLoading(order.id)
    try {
      await postPortalOrdersByIdCancel({ path: { id: order.id } })
      toast.success('订单已取消')
      fetchOrders(statusFilter, page)
    } catch (err) {
      toast.error(getErrorMessage(err, '取消失败'))
    } finally {
      setActionLoading(null)
      setConfirmDialog({ open: false, order: null })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">费用订单</h1>
          <p className="mt-1 text-sm text-muted-foreground">查看和管理您的所有订单</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="shadow-sm ring-0">
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-60 mt-2" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShoppingCart className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无订单</h3>
          <p className="text-sm text-muted-foreground mt-1">您还没有任何订单记录</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-background divide-y divide-border/50 overflow-hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/portal/orders/${order.id}`}
                className="block p-5 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{order.plan_name || '—'}</span>
                      <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {orderTypeMap[order.type ?? ''] ?? order.type}
                      </span>
                      {order.billing_cycle && (
                        <span className="text-xs text-muted-foreground">
                          {billingCycleMap[order.billing_cycle] ?? order.billing_cycle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="font-mono">{order.order_no}</span>
                      <span>{formatDate(order.created_at ?? '')}</span>
                    </div>
                    {order.remark && (
                      <p className="text-xs text-muted-foreground mt-1">{order.remark}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-semibold">{formatAmount(order.amount ?? 0)}</p>
                    <div className="mt-1">
                      <StatusDot status={order.status ?? ''} />
                    </div>
                    {order.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          className="h-7 px-3 text-xs"
                          disabled={actionLoading === order.id}
                          onClick={(e) => { e.preventDefault(); setConfirmDialog({ open: true, order }) }}
                        >
                          取消订单
                        </Button>
                        <Button
                          className="h-7 px-3 text-xs"
                          onClick={(e) => { e.preventDefault(); setPayOrder(order) }}
                        >
                          立即支付
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}

      {payOrder?.id && (
        <PayDialog
          open={!!payOrder}
          onOpenChange={(open) => !open && setPayOrder(null)}
          orderId={payOrder.id}
          amount={payOrder.amount ?? 0}
          onSuccess={() => {
            setPayOrder(null)
            fetchOrders(statusFilter, page)
          }}
        />
      )}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
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
    </div>
  )
}
