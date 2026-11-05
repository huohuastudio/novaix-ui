import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, CreditCard, Loader2, Pencil, Terminal, X as XIcon } from "lucide-react"
import { toast } from "sonner"
import type { ServicePortalModuleService, ServicePortalServiceOperation, SupplierAction } from "@/api"
import {
  postPortalServicesByIdConsole,
  postPortalServicesByIdRenew,
  putPortalServicesById,
} from "@/api"
import {
  getPortalOrdersQueryKey,
  getPortalServicesByIdActionsOptions,
  getPortalServicesByIdActionsQueryKey,
  getPortalServicesByIdOptions,
  getPortalServicesByIdQueryKey,
  getPortalServicesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PayDialog } from "@/pages/portal/orders/pay-dialog"
import { useFormatAmount, useFormatDate, useSiteName } from "@/hooks/use-site-settings"
import { useServiceOperation } from "@/hooks/use-service-operation"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { billingCycleMap } from "@/lib/order-constants"
import { serviceOperationTypeMap, serviceStatusConfig, unknownServiceStatus } from "@/lib/service-constants"
import { openSupplierConsole } from "@/lib/supplier-constants"
import { getErrorCode, getErrorMessage } from "@/lib/utils"
import { ServiceOverview } from "./service-overview"
import { ServiceActions } from "./service-actions"

// 已有待支付续费单
const ERR_RENEW_PENDING_EXISTS = 25019

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
      </div>
      <div className="rounded-2xl bg-background">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between px-5 py-3.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-background p-5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-7 w-20 mt-2" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-background">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between px-5 py-3.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 状态提示条：开通中、处理中、暂停等 */
function StatusNotice({ spinning, children }: { spinning?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-background p-5">
      {spinning && <Spinner className="text-muted-foreground shrink-0" />}
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

export default function PortalServiceDetail() {
  const siteName = useSiteName()
  const formatDate = useFormatDate()
  const formatAmount = useFormatAmount()
  const { id } = useParams<{ id: string }>()
  const serviceId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const serviceQuery = useQuery({
    ...getPortalServicesByIdOptions({ path: { id: serviceId } }),
    enabled: !!serviceId,
    // 开通中、退订中时轮询刷新详情（处理中的操作由 useServiceOperation 跟踪，完成后会刷新详情）
    refetchInterval: (query) => {
      const svc = query.state.data?.data
      return svc && (svc.status === "pending" || svc.status === "terminating") ? 10_000 : false
    },
  })
  const serviceRes = serviceQuery.data
  const service = serviceRes?.code === 0 && serviceRes.data ? (serviceRes.data as ServicePortalModuleService) : null

  useDocumentTitle(`${service?.name || "我的服务"} - ${siteName}`)

  // 服务不存在或加载失败（且无缓存数据）时返回列表页
  useEffect(() => {
    if (!service && (serviceQuery.isError || !!serviceRes)) {
      navigate("/portal/services", { replace: true })
    }
  }, [service, serviceQuery.isError, serviceRes, navigate])

  const actionsEnabled = !!service?.has_actions && service.status === "active"
  const actionsQuery = useQuery({
    ...getPortalServicesByIdActionsOptions({ path: { id: serviceId } }),
    enabled: !!serviceId && actionsEnabled,
  })
  const actions = useMemo(() => actionsQuery.data?.data ?? [], [actionsQuery.data])

  // 刷新详情，同时失效列表与操作列表缓存
  const refreshService = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getPortalServicesByIdQueryKey({ path: { id: serviceId } }) })
    queryClient.invalidateQueries({ queryKey: getPortalServicesQueryKey() })
    queryClient.invalidateQueries({ queryKey: getPortalServicesByIdActionsQueryKey({ path: { id: serviceId } }) })
  }, [queryClient, serviceId])

  const labelOf = useCallback((op: ServicePortalServiceOperation) => {
    if (op.type === "action") {
      return actions.find((a) => a.name === op.action)?.label || "操作"
    }
    return serviceOperationTypeMap[op.type ?? ""] ?? "操作"
  }, [actions])

  const { operation, processing, track } = useServiceOperation(service, labelOf, refreshService)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false)
  const [consoleLoading, setConsoleLoading] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [payOrder, setPayOrder] = useState<{ id: number; amount: number } | null>(null)

  const saveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed) {
      toast.error("名称不能为空")
      return
    }
    setSavingName(true)
    try {
      const { data: res } = await putPortalServicesById({ path: { id: serviceId }, body: { name: trimmed } })
      if (res?.code === 0) {
        toast.success("名称已更新")
        setEditingName(false)
        refreshService()
      } else {
        toast.error(res?.message || "保存失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "保存失败"))
    } finally {
      setSavingName(false)
    }
  }

  const handleToggleAutoRenew = async (checked: boolean) => {
    setTogglingAutoRenew(true)
    try {
      const { data: res } = await putPortalServicesById({ path: { id: serviceId }, body: { auto_renew: checked } })
      if (res?.code === 0) {
        toast.success(checked ? "已开启自动续费" : "已关闭自动续费")
        refreshService()
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setTogglingAutoRenew(false)
    }
  }

  const handleConsole = async () => {
    setConsoleLoading(true)
    try {
      const { data: res } = await postPortalServicesByIdConsole({ path: { id: serviceId } })
      if (res?.code === 0 && res.data && openSupplierConsole(res.data)) return
      toast.error(res?.message || "控制台暂不可用")
    } catch (err) {
      toast.error(getErrorMessage(err, "打开控制台失败"))
    } finally {
      setConsoleLoading(false)
    }
  }

  const handleRenew = async () => {
    setRenewing(true)
    try {
      const { data: res } = await postPortalServicesByIdRenew({ path: { id: serviceId } })
      if (res?.code === 0 && res.data?.id) {
        setRenewOpen(false)
        queryClient.invalidateQueries({ queryKey: getPortalOrdersQueryKey() })
        setPayOrder({ id: res.data.id, amount: res.data.amount ?? 0 })
      } else {
        toast.error(res?.message || "创建续费订单失败")
      }
    } catch (err) {
      if (getErrorCode(err) === ERR_RENEW_PENDING_EXISTS) {
        setRenewOpen(false)
        toast.error(getErrorMessage(err, "已有待支付的续费订单"), {
          action: { label: "查看订单", onClick: () => navigate("/portal/orders") },
        })
      } else {
        toast.error(getErrorMessage(err, "创建续费订单失败"))
      }
    } finally {
      setRenewing(false)
    }
  }

  const handleActionSubmitted = (op: ServicePortalServiceOperation, action: SupplierAction) => {
    track(op)
    if (op.status === "succeeded") {
      toast.success(`${action.label}已完成`)
    } else if (op.status === "failed") {
      toast.error(`${action.label}未成功，请稍后重试或提交工单`)
    } else {
      toast.success(`已提交「${action.label}」，正在处理`)
    }
    refreshService()
  }

  if (serviceQuery.isPending) return <DetailSkeleton />
  if (!service) return null

  const status = service.status ?? ""
  const cfg = serviceStatusConfig[status] ?? unknownServiceStatus
  const displayName = service.name || `服务 #${service.id}`
  const address = service.ip_address || service.ipv6_address || ""
  const showAutoRenew = status === "active" || status === "suspended"
  const operationLabel = operation ? labelOf(operation) : ""

  return (
    <>
      <div className="space-y-8">
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
              <Link to="/portal/services">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName()
                      if (e.key === "Escape") setEditingName(false)
                    }}
                    className="h-8 text-sm w-56"
                    maxLength={64}
                    placeholder="输入服务名称"
                    disabled={savingName}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="size-7" onClick={saveName} disabled={savingName}>
                    <Check className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingName(false)}>
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0 group/name">
                  <h1 className="text-xl font-semibold tracking-tight truncate" title={displayName}>{displayName}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 sm:opacity-0 sm:group-hover/name:opacity-100 focus-visible:opacity-100 transition-opacity"
                    onClick={() => { setNameValue(service.name ?? ""); setEditingName(true) }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ${cfg.color}`}>
                    <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-mono">{address || (status === "pending" ? "正在开通" : "未分配 IP")}</span>
                {service.os && <> · {service.os}</>}
                {service.expire_at && <> · 到期 {formatDate(service.expire_at)}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-11 sm:ml-0">
            {showAutoRenew && (
              <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground cursor-pointer">
                自动续费
                <Switch
                  checked={service.auto_renew ?? false}
                  onCheckedChange={handleToggleAutoRenew}
                  disabled={togglingAutoRenew}
                />
              </label>
            )}
            {service.can_console && (
              <Button variant="outline" className="bg-background" onClick={handleConsole} disabled={consoleLoading}>
                {consoleLoading ? <Spinner /> : <Terminal className="size-3.5" />}
                控制台
              </Button>
            )}
            {service.can_renew && (
              <Button onClick={() => setRenewOpen(true)}>
                <CreditCard className="size-3.5" />
                续费
              </Button>
            )}
          </div>
        </div>

        {/* 状态提示 */}
        {status === "pending" ? (
          <StatusNotice spinning>正在开通，通常需要几分钟，完成后将自动刷新</StatusNotice>
        ) : processing ? (
          <StatusNotice spinning>「{operationLabel}」处理中，请稍候</StatusNotice>
        ) : status === "terminating" ? (
          <StatusNotice spinning>服务退订处理中</StatusNotice>
        ) : status === "suspended" ? (
          <StatusNotice>服务已暂停。如因到期暂停，续费后将自动恢复；其他原因请提交工单咨询</StatusNotice>
        ) : status === "terminated" || status === "cancelled" ? (
          <StatusNotice>服务已终止</StatusNotice>
        ) : null}

        <ServiceOverview service={service} />

        {actionsEnabled && (
          <ServiceActions
            serviceId={serviceId}
            actions={actions}
            loading={actionsQuery.isPending}
            error={actionsQuery.isError}
            busy={processing}
            onSubmitted={handleActionSubmitted}
          />
        )}
      </div>

      {/* 续费确认 */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>续费服务</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl bg-muted/50 divide-y divide-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">计费周期</span>
              <span className="text-xs font-medium">{billingCycleMap[service.billing_cycle ?? ""] ?? service.billing_cycle ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">当前到期</span>
              <span className="text-xs font-medium">{formatDate(service.expire_at)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">续费金额</span>
              <span className="text-sm font-semibold">{formatAmount(service.renew_price ?? 0)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">创建续费订单后即可支付，支付成功后到期时间自动延长</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>取消</Button>
            <Button onClick={handleRenew} disabled={renewing}>
              {renewing && <Loader2 className="size-4 animate-spin" />}
              创建续费订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 支付续费订单 */}
      {payOrder && (
        <PayDialog
          open={!!payOrder}
          onOpenChange={(open) => { if (!open) setPayOrder(null) }}
          orderId={payOrder.id}
          amount={payOrder.amount}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: getPortalOrdersQueryKey() })
            refreshService()
          }}
          onAmountChanged={() => {
            queryClient.invalidateQueries({ queryKey: getPortalOrdersQueryKey() })
            navigate(`/portal/orders/${payOrder.id}`)
          }}
        />
      )}
    </>
  )
}
