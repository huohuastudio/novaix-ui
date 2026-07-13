import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  postPortalInstancesByIdRenew,
  postPortalInstancesByIdResetPassword,
  postPortalInstancesByIdReinstall,
  postPortalInstancesByIdTrafficPackages,
} from "@/api"
import {
  getPortalInstancesByIdTrafficPackagesOptions,
  getPortalPlansOptions,
} from "@/api/@tanstack/react-query.gen"
import type { PortalPortalInstanceItem, PortalPurchaseImageItem, PortalPortalTrafficPackageItem } from "@/api"
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
import { Loader2, KeyRound, RefreshCw, CreditCard, ArrowUpDown, Gauge } from "lucide-react"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { billingCycleMap } from "@/lib/order-constants"
import { trafficPackageTypeMap } from "@/lib/traffic-package-constants"

export function ManageSection({ instance, onRefresh }: { instance: PortalPortalInstanceItem; onRefresh: () => void }) {
  const navigate = useNavigate()
  const formatPrice = useFormatAmount()
  const { addTask } = usePortalTasks()
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

  const [trafficOpen, setTrafficOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [buyingTraffic, setBuyingTraffic] = useState(false)

  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [resettingPwd, setResettingPwd] = useState(false)

  const [reinstallOpen, setReinstallOpen] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [reinstallPassword, setReinstallPassword] = useState("")
  const [reinstalling, setReinstalling] = useState(false)

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

  const handleRenew = async () => {
    if (!instance.id) return
    setRenewing(true)
    try {
      const { data: res } = await postPortalInstancesByIdRenew({
        path: { id: instance.id },
        body: { billing_cycle: renewCycle },
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
    if (!instance.id || !newPassword || newPassword.length < 8) {
      toast.error("密码至少 8 个字符")
      return
    }
    setResettingPwd(true)
    try {
      const { data: res } = await postPortalInstancesByIdResetPassword({
        path: { id: instance.id },
        body: { password: newPassword },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "reset_password", instance.id)
        toast.success("密码重置任务已提交，重启后生效")
        setResetPwdOpen(false)
        setNewPassword("")
      } else {
        toast.error(res?.message || "重置密码失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "重置密码失败"))
    } finally {
      setResettingPwd(false)
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

  const isStopped = instance.status === "stopped"

  return (
    <>
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">管理操作</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {instance.billing_cycle !== "hourly" && (
            <button
              className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
              onClick={() => setRenewOpen(true)}
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
            onClick={() => setResetPwdOpen(true)}
          >
            <KeyRound className="size-5 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">重置密码</p>
            <p className="text-xs text-muted-foreground mt-1">重置 root 密码，重启后生效</p>
          </button>
          <button
            className={`rounded-2xl bg-background p-5 text-left transition-colors ${isStopped ? 'hover:bg-foreground/[.05]' : 'opacity-50 cursor-not-allowed'}`}
            onClick={isStopped ? () => setReinstallOpen(true) : undefined}
          >
            <RefreshCw className="size-5 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">重装系统</p>
            <p className="text-xs text-muted-foreground mt-1">{isStopped ? "更换操作系统镜像" : "需要先停止服务器"}</p>
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
              <Select value={renewCycle} onValueChange={setRenewCycle}>
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
              <Input
                type="password"
                placeholder="至少 8 个字符"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">密码修改后需要重启服务器才能生效</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwdOpen(false)}>取消</Button>
            <Button onClick={handleResetPassword} disabled={instanceBusy || resettingPwd || !newPassword}>
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
              <Input
                type="password"
                placeholder="至少 8 个字符"
                value={reinstallPassword}
                onChange={(e) => setReinstallPassword(e.target.value)}
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
    </>
  )
}
