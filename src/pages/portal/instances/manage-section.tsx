import { useCallback, useEffect, useMemo, useState, startTransition } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  postPortalInstancesByIdRenew,
  postPortalInstancesByIdResetPassword,
  postPortalInstancesByIdReinstall,
  postPortalInstancesByIdStop,
  postPortalInstancesByIdTrafficPackages,
  postPortalInstancesByIdMountIso,
  postPortalInstancesByIdUnmountIso,
} from "@/api"
import {
  getPortalInstancesByIdTrafficPackagesOptions,
  getPortalPlansOptions,
  getPortalIsosOptions,
} from "@/api/@tanstack/react-query.gen"
import type { PortalPortalInstanceItem, PortalPurchaseImageItem, PortalPortalTrafficPackageItem, PortalPortalIsoItem } from "@/api"
import { Badge } from "@/components/ui/badge"
import { getErrorMessage } from "@/lib/utils"
import { usePortalTasks } from "@/hooks/use-portal-tasks"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, KeyRound, RefreshCw, CreditCard, ArrowUpDown, Gauge, Disc } from "lucide-react"
import { PasswordInput } from "@/components/password-input"
import { useFormatAmount, useSiteSettings } from "@/hooks/use-site-settings"
import { generatePassword } from "@/lib/utils"
import { useCouponValidation } from "@/hooks/use-coupon-validation"
import { billingCycleMap } from "@/lib/order-constants"
import { trafficPackageTypeMap } from "@/lib/traffic-package-constants"

export function ManageSection({ instance, onRefresh, onPasswordChanged }: { instance: PortalPortalInstanceItem; onRefresh: () => void; onPasswordChanged?: () => void }) {
  const navigate = useNavigate()
  const formatPrice = useFormatAmount()
  const settings = useSiteSettings()
  const { addTask } = usePortalTasks()
  const newPassword = () => generatePassword(Number(settings.instance_auto_password_length) || 16)
  const autoPasswordEnabled = settings.instance_auto_password !== 'false'
  const instanceBusy = instance.active_task_id != null
  const enabledCycles = useMemo(() =>
    (instance.enabled_cycles ?? '').split(',').filter(Boolean),
    [instance.enabled_cycles]
  )

  const [renewOpen, setRenewOpen] = useState(false)
  const renewableCycles = useMemo(() => {
    const cycles = enabledCycles.filter(c => c !== 'hourly')
    return cycles.length ? cycles : ['monthly', 'quarterly', 'yearly']
  }, [enabledCycles])
  const [renewCycle, setRenewCycle] = useState(() =>
    renewableCycles.includes('monthly') ? 'monthly' : renewableCycles[0] ?? 'monthly'
  )
  const [renewing, setRenewing] = useState(false)
  const renewCoupon = useCouponValidation()

  const [trafficOpen, setTrafficOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [buyingTraffic, setBuyingTraffic] = useState(false)

  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwd, setResetPwd] = useState("")
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [autoRestart, setAutoRestart] = useState(true)
  const [resettingPwd, setResettingPwd] = useState(false)

  const [reinstallOpen, setReinstallOpen] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [reinstallPassword, setReinstallPassword] = useState("")
  const [showReinstallPwd, setShowReinstallPwd] = useState(false)
  const [reinstalling, setReinstalling] = useState(false)
  const [stopForReinstallOpen, setStopForReinstallOpen] = useState(false)
  const [stoppingForReinstall, setStoppingForReinstall] = useState(false)
  const [reinstallStopTaskId, setReinstallStopTaskId] = useState<number | null>(null)

  const [isoOpen, setIsoOpen] = useState(false)
  const [selectedIsoId, setSelectedIsoId] = useState<number | null>(null)
  const [selectedDriverIsoId, setSelectedDriverIsoId] = useState<number | null>(null)
  const [mountingIso, setMountingIso] = useState(false)
  const [unmountingIso, setUnmountingIso] = useState(false)

  // 停机完成后自动打开重装弹窗
  useEffect(() => {
    if (!reinstallStopTaskId) return
    if (instance.active_task_id) return
    if (instance.status === "running") return
    startTransition(() => {
      setReinstallStopTaskId(null)
      if (instance.status === "stopped") setReinstallOpen(true)
    })
  }, [reinstallStopTaskId, instance.active_task_id, instance.status])

  // 流量包列表：打开弹窗时才请求
  const trafficQuery = useQuery({
    ...getPortalInstancesByIdTrafficPackagesOptions({ path: { id: instance.id ?? 0 } }),
    enabled: trafficOpen && !!instance.id,
  })
  const packages = useMemo<PortalPortalTrafficPackageItem[]>(
    () => (trafficQuery.data?.data as PortalPortalTrafficPackageItem[] | undefined) ?? [],
    [trafficQuery.data],
  )
  const loadingPackages = trafficQuery.isPending
  // 未手动选择时默认选中第一个流量包
  const effectivePackageId = selectedPackageId ?? packages[0]?.id ?? null

  useEffect(() => {
    if (trafficQuery.isError) {
      toast.error(getErrorMessage(trafficQuery.error, "获取流量包列表失败"))
    }
  }, [trafficQuery.isError, trafficQuery.error])

  // 系统镜像列表：打开重装弹窗时才请求
  const plansQuery = useQuery({
    ...getPortalPlansOptions(),
    enabled: reinstallOpen,
  })
  const images = useMemo<PortalPurchaseImageItem[]>(() => {
    const all = plansQuery.data?.data?.plans?.flatMap((p) => p.images ?? []) ?? []
    return all.filter((img, i, arr) => arr.findIndex((a) => a.id === img.id) === i)
  }, [plansQuery.data])
  // 未手动选择时默认选中第一个镜像
  const effectiveImageId = selectedImageId ?? images[0]?.id ?? null

  // ISO 列表：打开挂载弹窗时才请求
  const isosQuery = useQuery({
    ...getPortalIsosOptions(),
    enabled: isoOpen,
  })
  const isos = useMemo<PortalPortalIsoItem[]>(
    () => (isosQuery.data?.data as PortalPortalIsoItem[] | undefined) ?? [],
    [isosQuery.data],
  )
  const effectiveIsoId = selectedIsoId ?? isos[0]?.id ?? null

  const openRenewDialog = useCallback(() => {
    renewCoupon.reset()
    setRenewOpen(true)
  }, [renewCoupon])

  // 验证续费优惠码
  const handleValidateRenewCoupon = async () => {
    const priceMap: Record<string, number | undefined> = {
      monthly: instance.price_monthly,
      quarterly: instance.price_quarterly,
      yearly: instance.price_yearly,
    }
    const renewAmount = priceMap[renewCycle] ?? 0
    if (renewAmount <= 0) {
      toast.error("无法获取续费价格，请刷新页面后重试")
      return
    }
    await renewCoupon.validate(renewAmount, "renew")
  }

  const handleRenew = async () => {
    if (!instance.id) return
    setRenewing(true)
    try {
      const { data: res } = await postPortalInstancesByIdRenew({
        path: { id: instance.id },
        body: {
          billing_cycle: renewCycle,
          ...(renewCoupon.result ? { coupon_code: renewCoupon.code.trim() } : {}),
        },
      })
      if (res?.code === 0) {
        toast.success("续费订单已创建，请前往支付")
        setRenewOpen(false)
        navigate("/portal/orders")
      } else {
        toast.error(res?.message || "创建续费订单失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建续费订单失败"))
    } finally {
      setRenewing(false)
    }
  }

  const handleBuyTraffic = async () => {
    if (!instance.id || !effectivePackageId) return
    setBuyingTraffic(true)
    try {
      const { data: res } = await postPortalInstancesByIdTrafficPackages({
        path: { id: instance.id },
        body: { package_id: effectivePackageId },
      })
      if (res?.code === 0) {
        toast.success("流量包订单已创建，请前往支付")
        setTrafficOpen(false)
        const orderId = res.data?.order_id
        navigate(orderId ? `/portal/orders/${orderId}` : "/portal/orders")
      } else {
        toast.error(res?.message || "购买流量包失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "购买流量包失败"))
    } finally {
      setBuyingTraffic(false)
    }
  }

  const handleResetPassword = async () => {
    if (!instance.id || !resetPwd || resetPwd.length < 8) {
      toast.error("密码至少 8 个字符")
      return
    }
    setResettingPwd(true)
    try {
      const { data: res } = await postPortalInstancesByIdResetPassword({
        path: { id: instance.id },
        body: { password: resetPwd, auto_restart: autoRestart },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "reset_password", instance.id)
        toast.success(autoRestart ? "密码重置任务已提交，将自动重启" : "密码重置任务已提交，重启后生效")
        setResetPwdOpen(false)
        setResetPwd("")
        onPasswordChanged?.()
      } else {
        toast.error(res?.message || "重置密码失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "重置密码失败"))
    } finally {
      setResettingPwd(false)
    }
  }

  const openResetPwdDialog = () => {
    setResetPwd(autoPasswordEnabled ? newPassword() : '')
    setShowResetPwd(autoPasswordEnabled)
    setAutoRestart(instance.status === 'running')
    setResetPwdOpen(true)
  }

  const openReinstallFlow = () => {
    const status = instance.status ?? ""
    if (status !== "stopped" && status !== "running" && status !== "frozen") {
      toast.error("当前状态不支持重装系统")
      return
    }
    const pwd = autoPasswordEnabled ? newPassword() : ''
    setReinstallPassword(pwd)
    setShowReinstallPwd(!!pwd)
    if (status === "stopped") {
      setReinstallOpen(true)
    } else {
      setStopForReinstallOpen(true)
    }
  }

  const handleStopForReinstall = async () => {
    if (!instance.id) return
    setStoppingForReinstall(true)
    try {
      const { data: res } = await postPortalInstancesByIdStop({ path: { id: instance.id } })
      if (res?.code === 0) {
        const taskId = (res.data as { task_id?: number })?.task_id
        if (taskId) {
          addTask(taskId, "stop_instance", instance.id)
          setReinstallStopTaskId(taskId)
        }
        toast.success("正在停止服务器，完成后将自动打开重装弹窗")
        setStopForReinstallOpen(false)
        onRefresh()
      } else {
        toast.error(res?.message || "停止服务器失败")
        setReinstallStopTaskId(null)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "停止服务器失败"))
      setReinstallStopTaskId(null)
    } finally {
      setStoppingForReinstall(false)
    }
  }

  const handleReinstall = async () => {
    if (!instance.id || !effectiveImageId) return
    if (!reinstallPassword || reinstallPassword.length < 8) {
      toast.error("密码至少 8 个字符")
      return
    }
    setReinstalling(true)
    try {
      const { data: res } = await postPortalInstancesByIdReinstall({
        path: { id: instance.id },
        body: { image_id: effectiveImageId, password: reinstallPassword },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "reinstall_instance", instance.id)
        toast.success("重装系统任务已提交")
        setReinstallOpen(false)
        setReinstallPassword("")
        onPasswordChanged?.()
        onRefresh()
      } else {
        toast.error(res?.message || "重装系统失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "重装系统失败"))
    } finally {
      setReinstalling(false)
    }
  }

  const handleMountIso = async () => {
    if (!instance.id || !effectiveIsoId) return
    setMountingIso(true)
    try {
      const body: { iso_id: number; iso1_id?: number } = { iso_id: effectiveIsoId }
      if (selectedDriverIsoId) body.iso1_id = selectedDriverIsoId
      const { data: res } = await postPortalInstancesByIdMountIso({
        path: { id: instance.id },
        body,
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "mount_iso", instance.id)
        toast.success("ISO 挂载任务已提交")
        setIsoOpen(false)
        onRefresh()
      } else {
        toast.error(res?.message || "挂载 ISO 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "挂载 ISO 失败"))
    } finally {
      setMountingIso(false)
    }
  }

  const handleUnmountIso = async () => {
    if (!instance.id) return
    setUnmountingIso(true)
    try {
      const { data: res } = await postPortalInstancesByIdUnmountIso({
        path: { id: instance.id },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "unmount_iso", instance.id)
        toast.success("ISO 卸载任务已提交")
        onRefresh()
      } else {
        toast.error(res?.message || "卸载 ISO 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "卸载 ISO 失败"))
    } finally {
      setUnmountingIso(false)
    }
  }

  return (
    <>
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">管理操作</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {instance.billing_cycle !== "hourly" && (
            <button
              className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
              onClick={openRenewDialog}
            >
              <CreditCard className="size-5 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">续费</p>
              <p className="text-xs text-muted-foreground mt-1">延长服务器到期时间</p>
            </button>
          )}
          {instance.billing_cycle !== "hourly" && (
            <button
              className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
              onClick={() => navigate(`/portal/servers/${instance.id}/upgrade`)}
            >
              <ArrowUpDown className="size-5 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">升级/降级</p>
              <p className="text-xs text-muted-foreground mt-1">变更套餐配置，按天折算差价</p>
            </button>
          )}
          <button
            className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
            onClick={openResetPwdDialog}
          >
            <KeyRound className="size-5 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">重置密码</p>
            <p className="text-xs text-muted-foreground mt-1">重置登录密码</p>
          </button>
          <button
            className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
            onClick={openReinstallFlow}
          >
            <RefreshCw className="size-5 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">重装系统</p>
            <p className="text-xs text-muted-foreground mt-1">更换操作系统镜像</p>
          </button>
          {(instance.traffic_limit ?? 0) > 0 && (
            <button
              className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
              onClick={() => setTrafficOpen(true)}
            >
              <Gauge className="size-5 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">购买流量包</p>
              <p className="text-xs text-muted-foreground mt-1">叠加流量额度或重置已用流量</p>
            </button>
          )}
          {instance.type === "virtual-machine" && (
            <button
              className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
              onClick={() => setIsoOpen(true)}
            >
              <Disc className="size-5 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">ISO 管理</p>
              <p className="text-xs text-muted-foreground mt-1">挂载或卸载 ISO 镜像</p>
            </button>
          )}
        </div>
      </section>

      {/* 购买流量包 Dialog */}
      <Dialog open={trafficOpen} onOpenChange={setTrafficOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>购买流量包</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {loadingPackages ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Gauge className="size-9 text-muted-foreground/25 mb-3" />
                <p className="text-[13px] text-muted-foreground">暂无可购买的流量包</p>
              </div>
            ) : (
              <div className="space-y-2">
                {packages.map((pkg) => {
                  const selected = effectivePackageId === pkg.id
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id ?? null)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        selected ? "border-foreground bg-foreground/[.04]" : "border-border hover:bg-foreground/[.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{pkg.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {trafficPackageTypeMap[pkg.type ?? ""] ?? pkg.type}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatPrice(pkg.price)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pkg.type === "reset" ? "清零当月已用流量" : `增加 ${pkg.traffic} GB 当期流量额度`}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrafficOpen(false)}>取消</Button>
            <Button onClick={handleBuyTraffic} disabled={buyingTraffic || !effectivePackageId}>
              {buyingTraffic && <Loader2 className="size-4 animate-spin" />}
              创建订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 续费 Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>续费云服务器</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>计费周期</Label>
              <Select value={renewCycle} onValueChange={(v) => { setRenewCycle(v); renewCoupon.setResult(null) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="shadow-sm ring-0">
                  {Object.entries(billingCycleMap)
                    .filter(([key]) => renewableCycles.includes(key))
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">续费订单创建后需要前往订单页面支付</p>
            <div className="space-y-2">
              <Label>优惠码（可选）</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入优惠码"
                  value={renewCoupon.code}
                  onChange={(e) => renewCoupon.updateCode(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={handleValidateRenewCoupon}
                  disabled={renewCoupon.validating || !renewCoupon.code.trim()}
                >
                  {renewCoupon.validating && <Loader2 className="size-4 animate-spin" />}
                  验证
                </Button>
              </div>
              {renewCoupon.result && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  优惠 {formatPrice(renewCoupon.result.discount_amount ?? 0)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>取消</Button>
            <Button onClick={handleRenew} disabled={renewing}>
              {renewing && <Loader2 className="size-4 animate-spin" />}
              创建续费订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码 Dialog */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>新密码</Label>
              <PasswordInput
                value={resetPwd}
                onChange={setResetPwd}
                show={showResetPwd}
                onToggleShow={() => setShowResetPwd(!showResetPwd)}
                onGenerate={() => { setResetPwd(newPassword()); setShowResetPwd(true) }}
              />
            </div>
            {instance.status === 'running' ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoRestart} onChange={(e) => setAutoRestart(e.target.checked)} className="accent-foreground" />
                <span className="text-sm">重置后自动重启</span>
              </label>
            ) : instance.cloud_init === false ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">该镜像不支持离线密码注入，请先启动服务器再重置密码</p>
            ) : (
              <p className="text-xs text-muted-foreground">密码将在下次启动时生效</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwdOpen(false)}>取消</Button>
            <Button
              onClick={handleResetPassword}
              disabled={instanceBusy || resettingPwd || !resetPwd || (instance.cloud_init === false && instance.status !== 'running')}
            >
              {resettingPwd && <Loader2 className="size-4 animate-spin" />}
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重装系统 Dialog */}
      <Dialog open={reinstallOpen} onOpenChange={setReinstallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重装系统</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>系统镜像</Label>
              <Select
                value={effectiveImageId ? String(effectiveImageId) : ""}
                onValueChange={(v) => setSelectedImageId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择系统镜像" />
                </SelectTrigger>
                <SelectContent className="shadow-sm ring-0">
                  {images.map((img) => (
                    <SelectItem key={img.id} value={String(img.id)}>
                      {img.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>新密码</Label>
              <PasswordInput
                value={reinstallPassword}
                onChange={setReinstallPassword}
                show={showReinstallPwd}
                onToggleShow={() => setShowReinstallPwd(!showReinstallPwd)}
                onGenerate={() => { setReinstallPassword(newPassword()); setShowReinstallPwd(true) }}
              />
            </div>
            <p className="text-xs text-destructive">重装将清除所有数据，此操作不可撤销</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReinstallOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleReinstall}
              disabled={instanceBusy || reinstalling || !effectiveImageId || !reinstallPassword}
            >
              {reinstalling && <Loader2 className="size-4 animate-spin" />}
              确认重装
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 停机后重装确认 Dialog */}
      <Dialog open={stopForReinstallOpen} onOpenChange={setStopForReinstallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>需要先停止服务器</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">重装系统需要先停止服务器。停止后将自动打开重装弹窗。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopForReinstallOpen(false)}>取消</Button>
            <Button onClick={handleStopForReinstall} disabled={instanceBusy || stoppingForReinstall}>
              {stoppingForReinstall && <Loader2 className="size-4 animate-spin" />}
              停止并重装
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ISO 管理 Dialog */}
      <Dialog open={isoOpen} onOpenChange={setIsoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ISO 管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>系统 ISO</Label>
              <Select
                value={effectiveIsoId ? String(effectiveIsoId) : ""}
                onValueChange={(v) => setSelectedIsoId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择 ISO 镜像" />
                </SelectTrigger>
                <SelectContent className="shadow-sm ring-0">
                  {isos.map((iso) => (
                    <SelectItem key={iso.id} value={String(iso.id)}>
                      {iso.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>驱动 ISO（可选）</Label>
              <Select
                value={selectedDriverIsoId ? String(selectedDriverIsoId) : "none"}
                onValueChange={(v) => setSelectedDriverIsoId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="不使用驱动 ISO" />
                </SelectTrigger>
                <SelectContent className="shadow-sm ring-0">
                  <SelectItem value="none">不使用</SelectItem>
                  {isos.map((iso) => (
                    <SelectItem key={iso.id} value={String(iso.id)}>
                      {iso.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">安装 Windows 时可挂载 VirtIO 驱动 ISO</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleUnmountIso} disabled={instanceBusy || unmountingIso}>
              {unmountingIso && <Loader2 className="size-4 animate-spin" />}
              卸载 ISO
            </Button>
            <Button onClick={handleMountIso} disabled={instanceBusy || mountingIso || !effectiveIsoId}>
              {mountingIso && <Loader2 className="size-4 animate-spin" />}
              挂载 ISO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
