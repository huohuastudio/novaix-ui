import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  MonitorPlay,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  Undo2,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAdminSupplierServicesByIdSecrets,
  postAdminSupplierServicesByIdConsole,
  postAdminSupplierServicesByIdOperations,
  postAdminSupplierServicesByIdSync,
} from "@/api"
import type {
  EntityOrder,
  ServiceAdminModuleServiceDetail,
  ServiceAdminServiceOperation,
  ServiceSecretItem,
  SupplierAction,
} from "@/api"
import {
  getAdminSupplierOperationsAttentionQueryKey,
  getAdminSupplierOperationsQueryKey,
  getAdminSupplierServicesByIdOptions,
  getAdminSupplierServicesByIdQueryKey,
  getAdminSupplierServicesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CopyButton } from "@/components/copy-button"
import { UserPopover } from "@/components/user-popover"
import { ModuleRefundDialog, type ModuleRefundOrder } from "@/components/module-refund-dialog"
import { ModuleOpStatusBadge, ModuleServiceStatusBadge } from "@/components/supplier-badges"
import { OperationLogDialog, OperationResolveDialog } from "@/components/supplier-operation-dialogs"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useConfirm } from "@/hooks/use-confirm"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"
import { useAdminPath, useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { hasCapability, useSupplierPlugins } from "@/hooks/use-supplier-meta"
import { billingCycleMap, fulfillmentStatusMap, orderStatusMap, orderTypeMap } from "@/lib/order-constants"
import {
  formatModuleSpec,
  isModuleOpActive,
  isModuleOpAttention,
  moduleOpRequesterMap,
  moduleOpStatusMap,
  moduleOpTypeMap,
  openSupplierConsole,
  suspendReasonMap,
} from "@/lib/supplier-constants"
import { formatMemory, getErrorMessage } from "@/lib/utils"
import { ServiceActionDialog, ServiceEditDialog } from "./service-dialogs"

const POLL_INTERVAL = 5000

function DetailSkeleton() {
  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-16" />)}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s}>
          {s > 0 && <Separator className="my-8" />}
          <section className="space-y-5">
            <div>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-40 mt-1" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 max-w-4xl">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </section>
        </div>
      ))}
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ? `min-w-0 ${className}` : "min-w-0"}>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5 break-all">{children}</div>
    </div>
  )
}

function SectionHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

function Mono({ value }: { value?: string }) {
  if (!value) return <span className="text-muted-foreground font-normal">-</span>
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <span className="font-mono text-xs truncate" title={value}>{value}</span>
      <CopyButton value={value} />
    </span>
  )
}

/** 凭据面板：交互与用户端连接信息一致，点击显示后可复制，查看会记录操作日志 */
function SecretsPanel({ serviceId }: { serviceId: number }) {
  const [secrets, setSecrets] = useState<ServiceSecretItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (secrets) {
      setSecrets(null)
      return
    }
    setLoading(true)
    try {
      const { data: res } = await getAdminSupplierServicesByIdSecrets({ path: { id: serviceId } })
      if (res?.code === 0 && res.data?.length) {
        setSecrets(res.data)
      } else if (res?.code === 0) {
        toast.info("暂无凭据")
      } else {
        toast.error(res?.message || "获取凭据失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "获取凭据失败"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-5">
      <SectionHeader title="登录凭据" description="上游返回的密码等敏感信息，查看会记录操作日志">
        <Button variant="outline" onClick={toggle} disabled={loading}>
          {loading ? <Spinner /> : secrets ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {secrets ? "隐藏凭据" : "查看凭据"}
        </Button>
      </SectionHeader>
      <div className="max-w-2xl rounded-md border divide-y">
        {secrets ? (
          secrets.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-muted-foreground shrink-0">{s.label || s.key}</span>
              <div className="flex min-w-0 items-center gap-1.5">
                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded select-all break-all">{s.value}</code>
                <CopyButton value={s.value ?? ""} />
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">凭据</span>
            <span className="text-xs font-medium font-mono">••••••••</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default function SupplierServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const serviceId = Number(id)
  const navigate = useNavigate()
  const adminPath = useAdminPath()
  const queryClient = useQueryClient()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const { confirm, ConfirmDialog } = useConfirm()
  const { pluginMap } = useSupplierPlugins()
  const [busy, setBusy] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<SupplierAction | null>(null)
  const [logId, setLogId] = useState<number | null>(null)
  const [resolving, setResolving] = useState<ServiceAdminServiceOperation | null>(null)
  const [refundOrder, setRefundOrder] = useState<ModuleRefundOrder | null>(null)

  // 详情：有进行中的操作时轮询刷新
  const detailQuery = useQuery({
    ...getAdminSupplierServicesByIdOptions({ path: { id: serviceId } }),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data?.data
      if (!d) return false
      return isModuleOpActive(d.active_operation?.status) || d.status === "pending" || d.status === "terminating"
        ? POLL_INTERVAL
        : false
    },
  })
  const service: ServiceAdminModuleServiceDetail | null = detailQuery.data?.code === 0 ? detailQuery.data.data ?? null : null
  const loading = detailQuery.isPending

  // 自定义操作需实时询问上游，单独查询并缓存，避免轮询时反复调用上游
  const canRunActions = service?.status === "active" || service?.status === "suspended"
  const actionsQuery = useQuery({
    ...getAdminSupplierServicesByIdOptions({ path: { id: serviceId }, query: { with_actions: true } }),
    enabled: !!id && canRunActions,
    staleTime: 5 * 60_000,
  })
  useQueryErrorToast(actionsQuery.error, "加载可执行操作失败")
  const actions = canRunActions ? actionsQuery.data?.data?.actions ?? [] : []

  useEffect(() => {
    if (!loading && !service) navigate(`${adminPath}/supplier/services`, { replace: true })
  }, [loading, service, navigate, adminPath])

  useBreadcrumb([
    { label: "服务管理", href: `${adminPath}/supplier/services` },
    { label: service?.name || (id ? `服务 #${id}` : "详情") },
  ])

  // 操作后刷新详情（含可执行操作）、列表与待处理队列
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getAdminSupplierServicesByIdQueryKey({ path: { id: serviceId } }) })
    queryClient.invalidateQueries({ queryKey: getAdminSupplierServicesQueryKey() })
    queryClient.invalidateQueries({ queryKey: getAdminSupplierOperationsQueryKey() })
    queryClient.invalidateQueries({ queryKey: getAdminSupplierOperationsAttentionQueryKey() })
  }, [queryClient, serviceId])

  const handleSync = async () => {
    setBusy("sync")
    try {
      const { data: res } = await postAdminSupplierServicesByIdSync({ path: { id: serviceId } })
      if (res?.code === 0) toast.success("已从上游同步")
      else toast.error(res?.message || "同步失败")
    } catch (err) {
      toast.error(getErrorMessage(err, "同步失败"))
    } finally {
      setBusy(null)
      refresh()
    }
  }

  const handleConsole = async () => {
    setBusy("console")
    try {
      const { data: res } = await postAdminSupplierServicesByIdConsole({ path: { id: serviceId } })
      if (res?.code !== 0 || !res.data) {
        toast.error(res?.message || "获取控制台失败")
        return
      }
      if (!openSupplierConsole(res.data)) toast.error("上游未返回有效的控制台地址")
    } catch (err) {
      toast.error(getErrorMessage(err, "获取控制台失败"))
    } finally {
      setBusy(null)
    }
  }

  const submitOperation = async (
    type: "suspend" | "unsuspend" | "terminate" | "action",
    label: string,
    extra?: { action?: string; input?: Record<string, string> },
  ): Promise<boolean> => {
    setBusy(type === "action" ? `action:${extra?.action}` : type)
    try {
      const { data: res } = await postAdminSupplierServicesByIdOperations({
        path: { id: serviceId },
        body: { type, ...extra },
      })
      if (res?.code !== 0) {
        toast.error(res?.message || `${label}失败`)
        return false
      }
      // 无需调用上游时 data 为空，表示已在本地直接生效
      toast.success(res.data ? `${label}已提交，正在执行` : `${label}成功`)
      return true
    } catch (err) {
      toast.error(getErrorMessage(err, `${label}失败`))
      return false
    } finally {
      setBusy(null)
      refresh()
    }
  }

  const handleSuspend = async () => {
    const ok = await confirm({
      title: "暂停服务",
      description: `确定要暂停服务「${service?.name}」吗？暂停后用户将无法使用，可随时恢复。`,
      confirmText: "暂停",
    })
    if (ok) await submitOperation("suspend", "暂停")
  }

  const handleTerminate = async () => {
    const ok = await confirm({
      title: "退订服务",
      description: `确定要退订服务「${service?.name}」吗？将向上游提交退订，上游资源会被释放且无法恢复。如需同时退款，请在下方关联订单中操作。`,
      confirmText: "确认退订",
      destructive: true,
    })
    if (ok) await submitOperation("terminate", "退订")
  }

  const handleAction = async (action: SupplierAction) => {
    const label = action.label || action.name || "操作"
    if (action.fields?.length) {
      setActionDialog(action)
      return
    }
    if (action.danger || action.confirm) {
      const ok = await confirm({
        title: label,
        description: action.confirm || `确定要执行「${label}」吗？`,
        confirmText: "执行",
        destructive: action.danger,
      })
      if (!ok) return
    }
    await submitOperation("action", label, { action: action.name })
  }

  if (loading) return <DetailSkeleton />
  if (!service) return null

  const plugin = pluginMap.get(service.plugin_id ?? "")
  const activeOp = service.active_operation
  const opRunning = isModuleOpActive(activeOp?.status)
  const isActive = service.status === "active"
  const isSuspended = service.status === "suspended"
  const spec = service.spec ?? {}
  const hasSpec = !!(spec.cpu || spec.memory || spec.disk || spec.bandwidth || spec.traffic || spec.region)
  const revenue = service.revenue ?? 0
  const cost = service.cost ?? 0
  const margin = revenue - cost
  const operations = service.operations ?? []
  const orders = service.orders ?? []

  return (
    <div className="px-6 pt-6 space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate" title={service.name}>
              {service.name || `服务 #${service.id}`}
            </h1>
            <ModuleServiceStatusBadge status={service.status} reason={service.suspend_reason} busy={opRunning} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[service.product_name, service.connection_name, service.remote_id ? `远端 ID ${service.remote_id}` : ""].filter(Boolean).join(" · ") || "-"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSync} disabled={!!busy}>
            {busy === "sync" ? <Spinner /> : <RefreshCw className="size-4" />}
            同步
          </Button>
          {hasCapability(plugin, "console") && isActive && (
            <Button variant="outline" onClick={handleConsole} disabled={!!busy}>
              {busy === "console" ? <Spinner /> : <MonitorPlay className="size-4" />}
              控制台
            </Button>
          )}
          {isActive && (
            <Button variant="outline" onClick={handleSuspend} disabled={!!busy || opRunning}>
              {busy === "suspend" ? <Spinner /> : <Pause className="size-4" />}
              暂停
            </Button>
          )}
          {isSuspended && (
            <Button variant="outline" onClick={() => submitOperation("unsuspend", "恢复")} disabled={!!busy || opRunning}>
              {busy === "unsuspend" ? <Spinner /> : <Play className="size-4" />}
              恢复
            </Button>
          )}
          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!!busy || opRunning}>
                  {busy?.startsWith("action:") ? <Spinner /> : <Wrench className="size-4" />}
                  更多操作
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((a) => (
                  <DropdownMenuItem
                    key={a.name}
                    className={a.danger ? "text-destructive" : undefined}
                    onClick={() => handleAction(a)}
                  >
                    {a.label || a.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)} disabled={!!busy}>
            <Pencil className="size-4" />
            编辑
          </Button>
          {(isActive || isSuspended) && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleTerminate}
              disabled={!!busy || opRunning}
            >
              {busy === "terminate" ? <Spinner /> : <Trash2 className="size-4" />}
              退订
            </Button>
          )}
        </div>
      </div>

      {/* 当前操作提示 */}
      {activeOp && (opRunning || isModuleOpAttention(activeOp.status)) && (
        <Alert variant={opRunning ? "default" : "warning"}>
          {opRunning ? <Spinner /> : <AlertTriangle />}
          <AlertDescription>
            <span>
              {opRunning ? "正在执行" : "需要处理"}：
              {moduleOpTypeMap[activeOp.type ?? ""] ?? activeOp.type}
              {activeOp.action ? `（${activeOp.action}）` : ""}
              {" · "}
              {moduleOpStatusMap[activeOp.status ?? ""]?.label ?? activeOp.status}
              {activeOp.error_message ? ` · ${activeOp.error_message}` : ""}
            </span>
            <span className="mt-2 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setLogId(activeOp.id ?? null)}>查看日志</Button>
              {isModuleOpAttention(activeOp.status) && (
                <Button size="sm" onClick={() => setResolving(activeOp)}>处理</Button>
              )}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-0 pb-8">
        {/* 基本信息 */}
        <section className="space-y-5">
          <SectionHeader title="基本信息" description="服务的本地记录与上游关联信息" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-4xl">
            <Field label="名称">{service.name || "-"}</Field>
            <Field label="用户"><UserPopover userId={service.user_id} username={service.username} /></Field>
            <Field label="商品">{service.product_name || "-"}</Field>
            <Field label="连接">{service.connection_name || "-"}</Field>
            <Field label="状态">
              <span className="inline-flex items-center gap-1.5">
                <ModuleServiceStatusBadge status={service.status} reason={service.suspend_reason} />
                {isSuspended && service.suspend_reason && (
                  <span className="text-xs text-muted-foreground font-normal">{suspendReasonMap[service.suspend_reason] ?? service.suspend_reason}</span>
                )}
              </span>
            </Field>
            <Field label="计费周期">{billingCycleMap[service.billing_cycle ?? ""] ?? (service.billing_cycle || "-")}</Field>
            <Field label="续费价格">{formatAmount(service.renew_price)}</Field>
            <Field label="到期时间">{formatDate(service.expire_at)}</Field>
            <Field label="上游到期时间">{formatDate(service.upstream_expire_at)}</Field>
            <Field label="自动续费">{service.auto_renew ? "开启" : "关闭"}</Field>
            <Field label="远端 ID"><Mono value={service.remote_id} /></Field>
            <Field label="本地引用"><Mono value={service.reference} /></Field>
            <Field label="开通时间">{formatDate(service.activated_at)}</Field>
            <Field label="创建时间">{formatDate(service.created_at)}</Field>
            <Field label="最近同步">{formatDate(service.last_synced_at)}</Field>
            {service.terminated_at && <Field label="终止时间">{formatDate(service.terminated_at)}</Field>}
            {service.sync_error && (
              <Field label="同步错误" className="col-span-2 sm:col-span-3">
                <span className="text-destructive font-normal">{service.sync_error}</span>
              </Field>
            )}
          </div>
        </section>

        {/* 展示信息 */}
        {(service.fields?.length ?? 0) > 0 && (
          <>
            <Separator className="my-8" />
            <section className="space-y-5">
              <SectionHeader title="展示信息" description="上游返回的服务信息，用户端同样可见" />
              <div className="max-w-3xl rounded-md border">
                <Table>
                  <TableBody>
                    {service.fields!.map((f) => (
                      <TableRow key={f.key}>
                        <TableCell className="w-40 text-muted-foreground">{f.label || f.key}</TableCell>
                        <TableCell className="font-medium break-all whitespace-normal">{f.value || "-"}</TableCell>
                        <TableCell className="w-10">{f.copyable && f.value && <CopyButton value={f.value} />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}

        {/* 规格 */}
        {hasSpec && (
          <>
            <Separator className="my-8" />
            <section className="space-y-5">
              <SectionHeader title="规格" description={formatModuleSpec(spec) || "购买时的商品规格"} />
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-x-8 gap-y-5 max-w-4xl">
                {spec.region && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">地域</div>
                    <div className="text-lg font-semibold">{spec.region}</div>
                  </div>
                )}
                {!!spec.cpu && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">CPU</div>
                    <div className="text-lg font-semibold tabular-nums">{spec.cpu} 核</div>
                  </div>
                )}
                {!!spec.memory && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">内存</div>
                    <div className="text-lg font-semibold tabular-nums">{formatMemory(spec.memory)}</div>
                  </div>
                )}
                {!!spec.disk && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">磁盘</div>
                    <div className="text-lg font-semibold tabular-nums">{spec.disk} GB</div>
                  </div>
                )}
                {!!spec.bandwidth && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">带宽</div>
                    <div className="text-lg font-semibold tabular-nums">{spec.bandwidth} Mbps</div>
                  </div>
                )}
                {!!spec.traffic && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">流量</div>
                    <div className="text-lg font-semibold tabular-nums">{spec.traffic} GB</div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* 收入与成本 */}
        <Separator className="my-8" />
        <section className="space-y-5">
          <SectionHeader title="收入与成本" description="按已支付订单累计的收入与商品参考成本" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">收入</div>
              <div className="text-2xl font-bold tabular-nums">{formatAmount(revenue)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">成本</div>
              <div className="text-2xl font-bold tabular-nums">{formatAmount(cost)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">毛利</div>
              <div className={`text-2xl font-bold tabular-nums ${margin < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                {formatAmount(margin)}
              </div>
              {revenue > 0 && <div className="text-xs text-muted-foreground">毛利率 {((margin / revenue) * 100).toFixed(1)}%</div>}
            </div>
          </div>
        </section>

        {/* 凭据 */}
        {service.has_secrets && (
          <>
            <Separator className="my-8" />
            <SecretsPanel serviceId={serviceId} />
          </>
        )}

        {/* 操作记录 */}
        <Separator className="my-8" />
        <section className="space-y-5">
          <SectionHeader title="操作记录" description="对上游的开通、续费、暂停等调用记录，点击查看日志与结果" />
          {operations.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无操作记录</p>
          ) : (
            <div className="rounded-md border">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>动作</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>发起方</TableHead>
                    <TableHead>尝试</TableHead>
                    <TableHead>错误信息</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-mono text-xs">#{op.id}</TableCell>
                      <TableCell>{moduleOpTypeMap[op.type ?? ""] ?? op.type}</TableCell>
                      <TableCell>{op.action ? <span className="font-mono text-xs">{op.action}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell><ModuleOpStatusBadge status={op.status} /></TableCell>
                      <TableCell>{moduleOpRequesterMap[op.requested_by ?? ""] ?? (op.requested_by || "-")}</TableCell>
                      <TableCell className="tabular-nums">{op.attempt ?? 0}</TableCell>
                      <TableCell>
                        {op.error_message ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block max-w-56 truncate text-xs text-destructive cursor-default">{op.error_message}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm break-all">{op.error_message}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(op.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => setLogId(op.id ?? null)}>
                                <FileText className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>查看日志</TooltipContent>
                          </Tooltip>
                          {isModuleOpAttention(op.status) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8" onClick={() => setResolving(op)}>
                                  <Wrench className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>处理</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* 关联订单 */}
        <Separator className="my-8" />
        <section className="space-y-5">
          <SectionHeader title="关联订单" description="该服务的新购与续费订单，已支付的订单可在此退款" />
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无关联订单</p>
          ) : (
            <div className="rounded-md border">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>周期</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>履约状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: EntityOrder) => {
                    const st = orderStatusMap[o.status ?? ""]
                    const fs = fulfillmentStatusMap[o.fulfillment_status ?? ""]
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link to={`${adminPath}/orders/${o.id}`} className="font-mono text-xs text-primary hover:underline">
                            {o.order_no}
                          </Link>
                        </TableCell>
                        <TableCell>{orderTypeMap[o.type ?? ""] ?? o.type}</TableCell>
                        <TableCell>{billingCycleMap[o.billing_cycle ?? ""] ?? (o.billing_cycle || "-")}</TableCell>
                        <TableCell className="font-medium">{formatAmount(o.amount)}</TableCell>
                        <TableCell>{st ? <Badge variant={st.variant}>{st.label}</Badge> : o.status}</TableCell>
                        <TableCell>{fs ? <Badge variant={fs.variant}>{fs.label}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(o.created_at)}</TableCell>
                        <TableCell>
                          {o.status === "paid" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive"
                                  onClick={() => setRefundOrder({ id: o.id, order_no: o.order_no, amount: o.amount, module_service_id: service.id })}
                                >
                                  <Undo2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>退款</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      <ServiceEditDialog open={editOpen} onOpenChange={setEditOpen} service={service} onSuccess={refresh} />
      <ServiceActionDialog
        action={actionDialog}
        onOpenChange={(open) => { if (!open) setActionDialog(null) }}
        onSubmit={(a, input) => submitOperation("action", a.label || a.name || "操作", { action: a.name, input })}
      />
      <OperationLogDialog operationId={logId} onOpenChange={(open) => { if (!open) setLogId(null) }} />
      <OperationResolveDialog operation={resolving} onOpenChange={(open) => { if (!open) setResolving(null) }} />
      <ModuleRefundDialog
        open={!!refundOrder}
        onOpenChange={(open) => { if (!open) setRefundOrder(null) }}
        order={refundOrder}
      />
      {ConfirmDialog}
    </div>
  )
}
