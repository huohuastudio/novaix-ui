import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import {
  getPortalInstancesById,
  getPortalInstancesByIdUpgradeOptions,
  postPortalInstancesByIdUpgrade,
} from "@/api"
import type { PortalPortalInstanceItem, ServiceUpgradeOption } from "@/api"
import { formatMemory, formatDisk, getErrorMessage } from "@/lib/utils"
import { billingCycleMap } from "@/lib/order-constants"
import { useFormatAmount, useSiteName } from "@/hooks/use-site-settings"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useDocumentTitle } from '@uidotdev/usehooks'

export default function PortalInstanceUpgrade() {
  const siteName = useSiteName()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const formatAmount = useFormatAmount()

  const [instance, setInstance] = useState<PortalPortalInstanceItem | null>(null)
  const [options, setOptions] = useState<ServiceUpgradeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useDocumentTitle(`升级/降级 - ${siteName}`)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const numId = Number(id)

    Promise.all([
      getPortalInstancesById({ path: { id: numId } }),
      getPortalInstancesByIdUpgradeOptions({ path: { id: numId } }),
    ]).then(([instRes, optRes]) => {
      if (instRes.data?.code === 0 && instRes.data.data) {
        setInstance(instRes.data.data as PortalPortalInstanceItem)
      } else {
        setError(instRes.data?.message || "无法获取实例信息")
        return
      }
      if (optRes.data?.code === 0 && optRes.data.data) {
        setOptions(optRes.data.data as ServiceUpgradeOption[])
      } else {
        setError(optRes.data?.message || "无法获取升级选项")
      }
    }).catch((err) => {
      setError(getErrorMessage(err, "加载失败，请稍后重试"))
    }).finally(() => {
      setLoading(false)
    })
  }, [id])

  const selected = options.find(o => o.plan_id === selectedPlanId)

  const handleUpgrade = async () => {
    if (!id || !selectedPlanId) return
    setSubmitting(true)
    try {
      const { data: res } = await postPortalInstancesByIdUpgrade({
        path: { id: Number(id) },
        body: { plan_id: selectedPlanId },
      })
      if (res?.code === 0) {
        toast.success("升级订单已创建，请前往支付")
        navigate("/portal/orders")
      } else {
        toast.error(res?.message || "创建升级订单失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建升级订单失败"))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
            <Link to={`/portal/servers/${id}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">升级/降级</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to={`/portal/servers/${id}`}>返回</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!instance) return null

  const cycle = instance.billing_cycle ?? "monthly"
  const cycleLabel = billingCycleMap[cycle] ?? cycle

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
          <Link to={`/portal/servers/${id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">升级/降级</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {instance.name} · 当前 {instance.cpu} 核 / {formatMemory(instance.memory ?? 0)} / {formatDisk(instance.disk ?? 0)}
          </p>
        </div>
      </div>

      {/* 当前配置 */}
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3">当前配置</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl bg-background p-4">
            <div className="text-[12px] text-muted-foreground">CPU</div>
            <div className="text-lg font-semibold mt-1">{instance.cpu} <span className="text-[13px] font-normal text-muted-foreground">vCPU</span></div>
          </div>
          <div className="rounded-2xl bg-background p-4">
            <div className="text-[12px] text-muted-foreground">内存</div>
            <div className="text-lg font-semibold mt-1">{formatMemory(instance.memory ?? 0)}</div>
          </div>
          <div className="rounded-2xl bg-background p-4">
            <div className="text-[12px] text-muted-foreground">磁盘</div>
            <div className="text-lg font-semibold mt-1">{formatDisk(instance.disk ?? 0)}</div>
          </div>
          <div className="rounded-2xl bg-background p-4">
            <div className="text-[12px] text-muted-foreground">带宽</div>
            <div className="text-lg font-semibold mt-1">{instance.bandwidth ?? 0} <span className="text-[13px] font-normal text-muted-foreground">Mbps</span></div>
          </div>
          <div className="rounded-2xl bg-background p-4">
            <div className="text-[12px] text-muted-foreground">计费周期</div>
            <div className="text-lg font-semibold mt-1">{cycleLabel}</div>
          </div>
        </div>
      </section>

      {/* 可选套餐 */}
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
          选择目标套餐
          {selected && (
            <span className="ml-2 text-foreground normal-case">
              · {(selected.price_diff ?? 0) > 0 ? `需补差价 ${formatAmount(selected.price_diff)}` : `退还 ${formatAmount(selected.refund_amount)}`}
              {(selected.remaining_days ?? 0) > 0 && ` (剩余 ${selected.remaining_days} 天)`}
            </span>
          )}
        </h2>

        {options.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] text-muted-foreground">暂无可用的升级/降级选项</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">当前套餐磁盘最大，无法切换到更小磁盘的套餐</p>
          </div>
        ) : (
          <div className="space-y-2">
            {options.map(opt => {
              const isSelected = selectedPlanId === opt.plan_id
              const isUpgrade = (opt.price_diff ?? 0) > 0
              return (
                <button
                  key={opt.plan_id}
                  className={`w-full rounded-2xl p-5 text-left transition-colors border-2 ${
                    isSelected
                      ? "border-foreground bg-background"
                      : "border-transparent bg-background hover:bg-foreground/[.03]"
                  }`}
                  onClick={() => setSelectedPlanId(opt.plan_id ?? null)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSelected && <Check className="size-4 text-foreground shrink-0" />}
                      <div>
                        <span className="text-sm font-medium">{opt.plan_name}</span>
                        <span className="ml-2 text-[12px] text-muted-foreground">
                          {opt.cpu} 核 / {formatMemory(opt.memory ?? 0)} / {formatDisk(opt.disk ?? 0)} / {opt.bandwidth ?? 0} Mbps
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {isUpgrade ? (
                        <span className="text-sm font-medium">补 {formatAmount(opt.price_diff)}</span>
                      ) : (
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">退 {formatAmount(opt.refund_amount)}</span>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {cycleLabel} {formatAmount(
                          cycle === "monthly" ? opt.price_monthly
                            : cycle === "quarterly" ? opt.price_quarterly
                            : opt.price_yearly
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 操作 */}
      {options.length > 0 && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" asChild>
            <Link to={`/portal/servers/${id}`}>取消</Link>
          </Button>
          <Button onClick={handleUpgrade} disabled={!selectedPlanId || submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {selected && (selected.price_diff ?? 0) > 0 ? "创建升级订单" : selected ? "创建降级订单" : "确认变更"}
          </Button>
        </div>
      )}
    </div>
  )
}
