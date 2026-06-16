import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, useLocation, Link } from "react-router-dom"
import {
  Activity,
  Camera,
  Terminal,
  Monitor,
  Play,
  Square,
  RotateCw,
  Plus,
  History,
  Trash2,
  ArrowLeft,
  Globe,
  Network,
  LifeBuoy,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  getPortalInstancesById,
  getPortalInstancesByIdSnapshots,
  postPortalInstancesByIdSnapshots,
  postPortalInstancesByIdSnapshotsByNameRestore,
  deletePortalInstancesByIdSnapshotsByName,
  postPortalInstancesByIdRenew,
  postPortalInstancesByIdResetPassword,
  postPortalInstancesByIdReinstall,
  postPortalInstancesByIdAutoBackup,
  getPortalPlans,
  getPortalInstancesByIdRdns,
  putPortalInstancesByIdIpsByIpIdRdns,
  getPortalInstancesByIdIps,
  postPortalInstancesByIdIpsPurchase,
  postPortalInstancesByIdIpsChange,
  deletePortalInstancesByIdIpsByIpId,
  getPortalInstancesByIdTrafficPackages,
  postPortalInstancesByIdTrafficPackages,
} from "@/api"
import type { PortalPortalInstanceItem, ServiceSnapshotItem, PortalPurchaseImageItem, EntityRdns, PortalPortalIpItem, PortalPortalTrafficPackageItem } from "@/api"
import { Badge } from "@/components/ui/badge"
import { formatBytes, formatMemory, formatDisk, getErrorMessage } from "@/lib/utils"
import { portalStatusConfig } from "@/lib/instance-constants"
import { usePortalInstanceState } from "@/hooks/use-portal-instance-state"
import { usePortalInstanceActions } from "@/hooks/use-portal-instance-actions"
import type { PortalPowerAction } from "@/hooks/use-portal-instance-actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WebTerminal } from "@/components/web-terminal"
import type { ConnectionStatus } from "@/components/web-terminal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Loader2, KeyRound, RefreshCw, CreditCard, ChartLine, Shield, ArrowUpDown, Clock, Gauge } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { InstanceStatsChart } from "@/components/instance-stats-chart"
import { VncConsole } from "@/components/vnc-console"
import type { VncStatus } from "@/components/vnc-console"
import { FirewallTab } from "./firewall-tab"
import { PortForwardTab } from "./port-forward-tab"
import { useFormatDate, useSiteName, useFormatAmount } from "@/hooks/use-site-settings"
import { billingCycleMap } from "@/lib/order-constants"
import { trafficPackageTypeMap } from "@/lib/traffic-package-constants"
import { CopyButton } from "@/components/copy-button"
import { useDocumentTitle } from '@uidotdev/usehooks'

const TABS = ["overview", "monitor", "firewall", "port-forward", "snapshots", "terminal", "console"] as const
type TabValue = (typeof TABS)[number]

function resolveTab(pathname: string, id: string): TabValue {
  const base = `/portal/servers/${id}`
  const sub = pathname.slice(base.length).replace(/^\//, "").split("/")[0]
  if (sub && TABS.includes(sub as TabValue)) return sub as TabValue
  return "overview"
}


function MetricTile({
  label,
  value,
  unit,
  percent,
}: {
  label: string
  value: string
  unit?: string
  percent?: number
}) {
  return (
    <div className="rounded-2xl bg-background p-5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-[13px] text-muted-foreground">{unit}</span>}
      </div>
      {percent !== undefined && (
        <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground/80 transition-all duration-700"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function ManageSection({ instance, onRefresh }: { instance: PortalPortalInstanceItem; onRefresh: () => void }) {
  const navigate = useNavigate()
  const formatPrice = useFormatAmount()

  const [renewOpen, setRenewOpen] = useState(false)
  const [renewCycle, setRenewCycle] = useState("monthly")
  const [renewing, setRenewing] = useState(false)

  const [trafficOpen, setTrafficOpen] = useState(false)
  const [packages, setPackages] = useState<PortalPortalTrafficPackageItem[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [buyingTraffic, setBuyingTraffic] = useState(false)

  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [resettingPwd, setResettingPwd] = useState(false)

  const [reinstallOpen, setReinstallOpen] = useState(false)
  const [images, setImages] = useState<PortalPurchaseImageItem[]>([])
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [reinstallPassword, setReinstallPassword] = useState("")
  const [reinstalling, setReinstalling] = useState(false)

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

  const openBuyTraffic = async () => {
    setTrafficOpen(true)
    if (!instance.id || packages.length > 0) return
    setLoadingPackages(true)
    try {
      const { data: res } = await getPortalInstancesByIdTrafficPackages({ path: { id: instance.id } })
      const items = (res?.data as PortalPortalTrafficPackageItem[] | undefined) ?? []
      setPackages(items)
      if (items.length > 0) setSelectedPackageId(items[0].id ?? null)
    } catch (err) {
      toast.error(getErrorMessage(err, "获取流量包列表失败"))
    } finally {
      setLoadingPackages(false)
    }
  }

  const handleBuyTraffic = async () => {
    if (!instance.id || !selectedPackageId) return
    setBuyingTraffic(true)
    try {
      const { data: res } = await postPortalInstancesByIdTrafficPackages({
        path: { id: instance.id },
        body: { package_id: selectedPackageId },
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

  const openReinstall = async () => {
    setReinstallOpen(true)
    if (images.length === 0) {
      const { data: res } = await getPortalPlans()
      const allImages = res?.data?.plans?.flatMap(p => p.images ?? []) ?? []
      const unique = allImages.filter((img, i, arr) => arr.findIndex(a => a.id === img.id) === i)
      setImages(unique)
      if (unique.length > 0) setSelectedImageId(unique[0].id ?? null)
    }
  }

  const handleReinstall = async () => {
    if (!instance.id || !selectedImageId) return
    if (!reinstallPassword || reinstallPassword.length < 8) {
      toast.error("密码至少 8 个字符")
      return
    }
    setReinstalling(true)
    try {
      const { data: res } = await postPortalInstancesByIdReinstall({
        path: { id: instance.id },
        body: { image_id: selectedImageId, password: reinstallPassword },
      })
      if (res?.code === 0) {
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
            onClick={isStopped ? openReinstall : undefined}
          >
            <RefreshCw className="size-5 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">重装系统</p>
            <p className="text-xs text-muted-foreground mt-1">{isStopped ? "更换操作系统镜像" : "需要先停止服务器"}</p>
          </button>
          {(instance.traffic_limit ?? 0) > 0 && (
            <button
              className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors"
              onClick={openBuyTraffic}
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
                  const selected = selectedPackageId === pkg.id
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
            <Button onClick={handleBuyTraffic} disabled={buyingTraffic || !selectedPackageId}>
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
                  <SelectItem value="monthly">{billingCycleMap.monthly}</SelectItem>
                  <SelectItem value="quarterly">{billingCycleMap.quarterly}</SelectItem>
                  <SelectItem value="yearly">{billingCycleMap.yearly}</SelectItem>
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
            <Button onClick={handleResetPassword} disabled={resettingPwd || !newPassword}>
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
                value={selectedImageId ? String(selectedImageId) : ""}
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
              disabled={reinstalling || !selectedImageId || !reinstallPassword}
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

function NetworkSection({ instance, onRefresh }: { instance: PortalPortalInstanceItem; onRefresh: () => void }) {
  const navigate = useNavigate()
  const [ips, setIps] = useState<PortalPortalIpItem[]>([])
  const [rdnsMap, setRdnsMap] = useState<Record<number, EntityRdns>>({})
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [releaseConfirm, setReleaseConfirm] = useState<PortalPortalIpItem | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [changingIP, setChangingIP] = useState(false)
  const [rdnsDialog, setRdnsDialog] = useState<PortalPortalIpItem | null>(null)
  const [rdnsHostname, setRdnsHostname] = useState("")
  const [rdnsSaving, setRdnsSaving] = useState(false)

  const fetchIps = useCallback(async () => {
    if (!instance.id) return
    try {
      const { data: res } = await getPortalInstancesByIdIps({ path: { id: instance.id } })
      const items = (res?.data as PortalPortalIpItem[] | undefined) ?? []
      setIps(items)
    } catch {
      const fallbackIps: PortalPortalIpItem[] = []
      if (instance.ip_address) {
        fallbackIps.push({ id: 0, address: instance.ip_address, is_primary: true })
      }
      setIps(fallbackIps)
    } finally {
      setLoading(false)
    }
  }, [instance.id, instance.ip_address])

  const fetchRdns = useCallback(async () => {
    if (!instance.id) return
    try {
      const { data: res } = await getPortalInstancesByIdRdns({ path: { id: instance.id } })
      if (res?.code === 0 && res.data) {
        const map: Record<number, EntityRdns> = {}
        for (const r of res.data as EntityRdns[]) {
          if (r.ip_id) map[r.ip_id] = r
        }
        setRdnsMap(map)
      }
    } catch {
      // rDNS 加载失败不影响主流程
    }
  }, [instance.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIps()
    fetchRdns()
  }, [fetchIps, fetchRdns])

  const handlePurchaseIp = async () => {
    if (!instance.id) return
    setPurchasing(true)
    try {
      const { data: res } = await postPortalInstancesByIdIpsPurchase({ path: { id: instance.id } })
      if (res?.code === 0) {
        const data = res.data as Record<string, unknown> | undefined
        const orderId = data?.order_id ?? data?.id
        toast.success(instance.nat_info ? "独享 IP 订单已创建" : "附加 IP 订单已创建")
        if (orderId) {
          navigate(`/portal/orders/${orderId}`)
        } else {
          navigate("/portal/orders")
        }
      } else {
        toast.error(res?.message || "创建订单失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建订单失败"))
    } finally {
      setPurchasing(false)
    }
  }

  const handleRelease = async () => {
    if (!instance.id || !releaseConfirm?.id) return
    setReleasing(true)
    try {
      const { data: res } = await deletePortalInstancesByIdIpsByIpId({
        path: { id: instance.id, ipId: releaseConfirm.id! },
      })
      if (res?.code === 0) {
        toast.success("IP 已释放")
        setReleaseConfirm(null)
        fetchIps()
        onRefresh()
      } else {
        toast.error(res?.message || "释放 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "释放 IP 失败"))
    } finally {
      setReleasing(false)
    }
  }

  const handleChangeIP = async (ip: PortalPortalIpItem) => {
    if (!instance.id || !ip.id) return
    setChangingIP(true)
    try {
      const { data: res } = await postPortalInstancesByIdIpsChange({
        path: { id: instance.id },
        body: { shared_ip_id: ip.id },
      })
      if (res?.code === 0) {
        toast.success("换 IP 任务已提交，请稍候刷新")
        fetchIps()
        onRefresh()
      } else {
        toast.error(res?.message || "换 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "换 IP 失败"))
    } finally {
      setChangingIP(false)
    }
  }

  const handleSetRdns = async () => {
    if (!instance.id || !rdnsDialog?.id) return
    setRdnsSaving(true)
    try {
      const { data: res } = await putPortalInstancesByIdIpsByIpIdRdns({
        path: { id: instance.id, ipId: rdnsDialog.id },
        body: { hostname: rdnsHostname.trim() },
      })
      if (res?.code === 0) {
        toast.success("rDNS 已更新")
        setRdnsDialog(null)
        setRdnsHostname("")
        fetchRdns()
      } else {
        toast.error((res as Record<string, unknown>)?.message as string || "设置 rDNS 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "设置 rDNS 失败"))
    } finally {
      setRdnsSaving(false)
    }
  }

  const openRdnsDialog = (ip: PortalPortalIpItem) => {
    const existing = ip.id ? rdnsMap[ip.id] : undefined
    setRdnsHostname(existing?.hostname ?? "")
    setRdnsDialog(ip)
  }

  if (loading) {
    return (
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">网络</h2>
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <div>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </div>
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">
            {instance.nat_info ? '独享 IP' : '网络'}
          </h2>
          <Button variant="outline" onClick={handlePurchaseIp} disabled={purchasing}>
            {purchasing ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            {instance.nat_info ? '购买独享 IP' : '添加 IP'}
          </Button>
        </div>
        {ips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Network className="size-10 text-muted-foreground/25 mb-3" />
            <p className="text-[13px] text-muted-foreground">
              {instance.nat_info ? '暂无独享 IP，购买后可获得独立出口和全端口访问' : '暂无 IP 地址'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {ips.map((ip, idx) => {
              const rdns = ip.id ? rdnsMap[ip.id] : undefined
              return (
                <div key={ip.id || idx} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium font-mono truncate">{ip.address}</span>
                        {ip.is_primary && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">主 IP</Badge>
                        )}
                        {instance.nat_info && !ip.is_primary && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">独享</Badge>
                        )}
                      </div>
                      {rdns?.hostname && (
                        <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{rdns.hostname}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!instance.nat_info && ip.id !== 0 && (
                      <Button
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => openRdnsDialog(ip)}
                      >
                        设置 rDNS
                      </Button>
                    )}
                    {instance.nat_info && !ip.is_primary && ip.id !== 0 && (
                      <Button
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleChangeIP(ip)}
                        disabled={changingIP}
                      >
                        换 IP
                      </Button>
                    )}
                    {!ip.is_primary && ip.id !== 0 && (
                      <Button
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setReleaseConfirm(ip)}
                      >
                        释放
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 设置 rDNS Dialog */}
      <Dialog open={rdnsDialog !== null} onOpenChange={(open) => { if (!open) setRdnsDialog(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>设置 rDNS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              为 <span className="font-mono font-medium">{rdnsDialog?.address}</span> 设置反向 DNS 记录
            </p>
            <div className="space-y-2">
              <Label>主机名</Label>
              <Input
                placeholder="例如 mail.example.com"
                value={rdnsHostname}
                onChange={(e) => setRdnsHostname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetRdns()}
              />
            </div>
            <p className="text-xs text-muted-foreground">留空可清除现有的 rDNS 记录</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRdnsDialog(null)}>取消</Button>
            <Button onClick={handleSetRdns} disabled={rdnsSaving}>
              {rdnsSaving && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 释放 IP 确认 */}
      <AlertDialog open={releaseConfirm !== null} onOpenChange={(open) => { if (!open) setReleaseConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{instance.nat_info ? '释放独享 IP' : '释放附加 IP'}</AlertDialogTitle>
            <AlertDialogDescription>
              确定要释放 IP 地址 <span className="font-mono font-medium">{releaseConfirm?.address}</span> 吗？释放后该 IP 将不再可用，且不会退款。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleRelease}
              disabled={releasing}
            >
              {releasing && <Loader2 className="size-4 animate-spin" />}
              确认释放
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function OverviewTab({ instance, onRefresh }: { instance: PortalPortalInstanceItem; onRefresh: () => void }) {
  const formatDate = useFormatDate()
  const isRunning = instance.status === "running"
  const state = usePortalInstanceState(instance.id, isRunning)

  const memPercent = state?.mem_total ? ((state.mem_used ?? 0) / state.mem_total) * 100 : 0
  const diskPercent = state?.disk_total ? ((state.disk_used ?? 0) / state.disk_total) * 100 : 0
  const trafficTotal = (instance.traffic_limit ?? 0) + (instance.traffic_extra ?? 0)
  const trafficPercent = trafficTotal
    ? Math.min(((instance.traffic_used ?? 0) / trafficTotal) * 100, 100)
    : 0

  return (
    <div className="space-y-8">
      {/* 实时监控 */}
      {isRunning && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">实时监控</h2>
            {state?.uptime && (
              <span className="text-[12px] text-muted-foreground">运行 {state.uptime}</span>
            )}
          </div>
          {state ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricTile
                label="CPU 累计"
                value={((state.cpu_usage ?? 0) / 1e9).toFixed(1)}
                unit={`秒 · ${instance.cpu ?? 0} 核`}
              />
              <MetricTile
                label="内存"
                value={formatBytes(state.mem_used ?? 0)}
                unit={`/ ${formatMemory(instance.memory ?? 0)}`}
                percent={memPercent}
              />
              <MetricTile
                label="磁盘"
                value={formatBytes(state.disk_used ?? 0)}
                unit={`/ ${formatDisk(instance.disk ?? 0)}`}
                percent={state.disk_total ? diskPercent : undefined}
              />
              <MetricTile
                label="网络"
                value={`↓ ${formatBytes(state.net_rx ?? 0)}`}
                unit={`↑ ${formatBytes(state.net_tx ?? 0)}`}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-background p-5">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-7 w-20 mt-2" />
                  <Skeleton className="h-1 w-full rounded-full mt-3" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 资源配置 */}
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">资源配置</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="CPU" value={String(instance.cpu ?? 0)} unit="vCPU" />
          <MetricTile label="内存" value={formatMemory(instance.memory ?? 0)} />
          <MetricTile label="磁盘" value={formatDisk(instance.disk ?? 0)} />
          <MetricTile
            label="带宽"
            value={instance.bandwidth ? String(instance.bandwidth) : "不限"}
            unit={instance.bandwidth ? "Mbps" : undefined}
          />
        </div>
        {(instance.traffic_limit ?? 0) > 0 && (
          <div className="rounded-2xl bg-background p-5 mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-muted-foreground">
                流量
                {instance.traffic_throttled && (
                  <span className="ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">已限速</span>
                )}
              </span>
              <span className="text-[13px] tabular-nums">
                {formatDisk(instance.traffic_used ?? 0)} / {formatDisk(trafficTotal)}
              </span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${instance.traffic_throttled ? "bg-amber-500" : trafficPercent >= 80 ? "bg-orange-500" : "bg-foreground/80"}`}
                style={{ width: `${trafficPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 网络 */}
      <NetworkSection instance={instance} onRefresh={onRefresh} />

      {/* NAT 信息 */}
      {instance.nat_info && (
        <section>
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">连接信息</h2>
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-muted-foreground">连接地址</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium font-mono">
                  {instance.nat_info.shared_ip_address}:{instance.nat_info.ssh_port}
                </span>
                <CopyButton value={`${instance.nat_info.shared_ip_address}:${instance.nat_info.ssh_port}`} />
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-muted-foreground">可用端口</span>
              <span className="text-[13px] font-medium font-mono">
                {instance.nat_info.port_start != null && instance.nat_info.port_end != null
                  ? `${instance.nat_info.port_start + 1} - ${instance.nat_info.port_end}`
                  : "-"}
              </span>
            </div>
            {instance.nat_info.ssh_command && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[13px] text-muted-foreground">SSH 命令</span>
                <div className="flex items-center gap-1.5">
                  <code className="text-[12px] font-mono bg-muted px-2 py-0.5 rounded">{instance.nat_info.ssh_command}</code>
                  <CopyButton value={instance.nat_info.ssh_command} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 详细信息 */}
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">详细信息</h2>
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          <InfoRow label="操作系统" value={
            state?.os_info
              ? [state.os_info.os, state.os_info.os_version].filter(Boolean).join(" ") || instance.os_type || "-"
              : instance.os_type || "-"
          } />
          <InfoRow label="计费周期" value={billingCycleMap[instance.billing_cycle ?? ''] ?? instance.billing_cycle ?? '-'} />
          <InfoRow label="到期时间" value={formatDate(instance.expire_at)} />
          <InfoRow label="创建时间" value={formatDate(instance.created_at)} />
          {state?.os_info?.kernel_version && (
            <InfoRow label="内核版本" value={state.os_info.kernel_version} />
          )}
        </div>
      </section>

      <ManageSection instance={instance} onRefresh={onRefresh} />
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-[13px] font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}

function SnapshotsTab({ instanceId, autoBackup, lastBackupAt, onAutoBackupChange }: {
  instanceId: number
  autoBackup?: boolean
  lastBackupAt?: string
  onAutoBackupChange: (enabled: boolean) => void
}) {
  const formatDate = useFormatDate()
  const [snapshots, setSnapshots] = useState<ServiceSnapshotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState("")
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  const handleToggleAutoBackup = async (checked: boolean) => {
    setToggling(true)
    try {
      const { data: res } = await postPortalInstancesByIdAutoBackup({
        path: { id: instanceId },
        body: { enabled: checked },
      })
      if (res?.code === 0) {
        toast.success(checked ? "已开启自动备份" : "已关闭自动备份")
        onAutoBackupChange(checked)
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setToggling(false)
    }
  }

  const fetchSnapshots = useCallback(async () => {
    try {
      const { data: res } = await getPortalInstancesByIdSnapshots({
        path: { id: instanceId },
      })
      if (res?.code === 0 && res.data) {
        setSnapshots(res.data as ServiceSnapshotItem[])
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "获取快照列表失败"))
    } finally {
      setLoading(false)
    }
  }, [instanceId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    fetchSnapshots()
  }, [fetchSnapshots])

  const handleCreate = async () => {
    if (!snapshotName.trim()) return
    setCreating(true)
    try {
      const { data: res } = await postPortalInstancesByIdSnapshots({
        path: { id: instanceId },
        body: { name: snapshotName.trim() },
      })
      if (res?.code === 0) {
        toast.success("创建快照任务已提交")
        setCreateOpen(false)
        setSnapshotName("")
        setTimeout(fetchSnapshots, 2000)
      } else {
        toast.error((res as Record<string, unknown>)?.message as string || "创建快照失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建快照失败"))
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (name: string) => {
    setRestoreConfirm(null)
    setActionLoading(name)
    try {
      const { data: res } = await postPortalInstancesByIdSnapshotsByNameRestore({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        toast.success("恢复快照任务已提交")
      } else {
        toast.error((res as Record<string, unknown>)?.message as string || "恢复快照失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "恢复快照失败"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (name: string) => {
    setDeleteConfirm(null)
    setActionLoading(name)
    try {
      const { data: res } = await deletePortalInstancesByIdSnapshotsByName({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        toast.success("删除快照任务已提交")
        setTimeout(fetchSnapshots, 2000)
      } else {
        toast.error((res as Record<string, unknown>)?.message as string || "删除快照失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除快照失败"))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40 mt-1.5" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between rounded-2xl bg-background px-5 py-4 mb-4">
          <div className="flex items-center gap-3">
            <Clock className="size-4 text-muted-foreground" />
            <div>
              <div className="text-[13px] font-medium">自动备份</div>
              <div className="text-[12px] text-muted-foreground">
                {autoBackup && lastBackupAt
                  ? `上次备份: ${formatDate(lastBackupAt)}`
                  : "系统按策略自动创建快照"}
              </div>
            </div>
          </div>
          <Switch
            checked={autoBackup ?? false}
            onCheckedChange={handleToggleAutoBackup}
            disabled={toggling}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">快照管理</h2>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            创建快照
          </Button>
        </div>

        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Camera className="size-10 text-muted-foreground/25 mb-3" />
            <p className="text-[13px] text-muted-foreground">暂无快照</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">快照可以保存当前状态，便于后续恢复</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {snapshots.map((snap) => (
              <div key={snap.name} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-[13px] font-medium">{snap.name}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {formatDate(snap.created_at)}
                    {snap.stateful && " · 包含运行状态"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={actionLoading === snap.name}
                    onClick={() => setRestoreConfirm(snap.name!)}
                  >
                    {actionLoading === snap.name ? <Spinner /> : <History className="size-3.5" />}
                    恢复
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={actionLoading === snap.name}
                    onClick={() => setDeleteConfirm(snap.name!)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建快照</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="输入快照名称"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating || !snapshotName.trim()}>
              {creating && <Spinner />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={restoreConfirm !== null} onOpenChange={(open) => { if (!open) setRestoreConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复快照</AlertDialogTitle>
            <AlertDialogDescription>
              确定要恢复到快照「{restoreConfirm}」的状态吗？当前数据将被覆盖。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreConfirm && handleRestore(restoreConfirm)}>确认恢复</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除快照</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除快照「{deleteConfirm}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

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

export default function PortalInstanceDetail() {
  const siteName = useSiteName()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [instance, setInstance] = useState<PortalPortalInstanceItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [terminalStatus, setTerminalStatus] = useState<ConnectionStatus>("connecting")
  const [vncStatus, setVncStatus] = useState<VncStatus>("connecting")
  const [pendingTab, setPendingTab] = useState<string | null>(null)

  const activeTab = id ? resolveTab(location.pathname, id) : "overview"
  const [visitedTabs, setVisitedTabs] = useState<Set<TabValue>>(() => new Set(["overview", activeTab]))
  const terminalConnected = (activeTab === "terminal" && terminalStatus === "connected") ||
    (activeTab === "console" && vncStatus === "connected")

  useDocumentTitle(`${instance?.name ?? "云服务器"} - ${siteName}`)

  const fetchInstance = useCallback(
    async (silent = false) => {
      if (!id) return
      if (!silent) setLoading(true)
      try {
        const { data: res } = await getPortalInstancesById({ path: { id: Number(id) } })
        if (res?.code === 0 && res.data) {
          setInstance(res.data as PortalPortalInstanceItem)
        } else if (!silent) {
          navigate("/portal/servers", { replace: true })
        }
      } catch {
        if (!silent) navigate("/portal/servers", { replace: true })
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id, navigate],
  )

  const refreshInstance = useCallback(() => fetchInstance(true), [fetchInstance])
  const { handlePowerAction, loadingId, ConfirmDialog } = usePortalInstanceActions(refreshInstance)
  const busy = loadingId === Number(id)

  const navigateToTab = useCallback(
    (tab: string) => {
      setVisitedTabs(prev => new Set(prev).add(tab as TabValue))
      navigate(tab === "overview" ? `/portal/servers/${id}` : `/portal/servers/${id}/${tab}`)
    },
    [id, navigate],
  )

  const handleTabChange = (tab: string) => {
    if (terminalConnected && tab !== "terminal") {
      setPendingTab(tab)
      return
    }
    navigateToTab(tab)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    fetchInstance(false)
  }, [fetchInstance])

  const doPower = (action: PortalPowerAction) => {
    if (!instance) return
    handlePowerAction(instance, action)
  }

  if (loading) return <DetailSkeleton />
  if (!instance) return null

  const status = instance.status ?? "stopped"
  const cfg = portalStatusConfig[status] ?? { label: "未知", color: "text-zinc-400", dot: "bg-zinc-400" }
  const isRunning = status === "running"
  const isStopped = status === "stopped" || status === "frozen"
  const isRescue = status === "rescue"
  const isVM = instance.type === "virtual-machine"
  const isTerminalTab = activeTab === "terminal" || activeTab === "console"

  return (
    <>
      <div className={isTerminalTab ? "flex flex-col flex-1 min-h-0 space-y-6" : "space-y-6"}>
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
              <Link to="/portal/servers">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight">{instance.name}</h1>
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${cfg.color}`}>
                  <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                <span className="font-mono">{instance.ip_address || "未分配 IP"}</span>
                {instance.os_type && <> · {instance.os_type}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-11 sm:ml-0">
            {isStopped && (
              <Button onClick={() => doPower("start")} disabled={busy}>
                {busy ? <Spinner /> : <Play className="size-3.5" />}
                启动
              </Button>
            )}
            {isRunning && (
              <>
                <Button variant="outline" onClick={() => doPower("restart")} disabled={busy}>
                  {busy ? <Spinner /> : <RotateCw className="size-3.5" />}
                  重启
                </Button>
                <Button variant="outline" onClick={() => doPower("stop")} disabled={busy}>
                  {busy ? <Spinner /> : <Square className="size-3.5" />}
                  停止
                </Button>
              </>
            )}
            {isRescue && (
              <Button variant="outline" onClick={() => doPower("unrescue")} disabled={busy}>
                {busy ? <Spinner /> : <LifeBuoy className="size-3.5" />}
                退出救援
              </Button>
            )}
            {!isRescue && isVM && (isStopped || isRunning) && (
              <Button variant="outline" onClick={() => doPower("rescue")} disabled={busy}>
                {busy ? <Spinner /> : <LifeBuoy className="size-3.5" />}
                救援模式
              </Button>
            )}
          </div>
        </div>

        {/* Tab */}
        <div className="flex gap-1 rounded-xl bg-background p-1 w-fit">
          {([
            { key: "overview", icon: Activity, label: "概览" },
            { key: "monitor", icon: ChartLine, label: "监控" },
            { key: "firewall", icon: Shield, label: "防火墙" },
            { key: "port-forward", icon: ArrowUpDown, label: "端口转发" },
            { key: "snapshots", icon: Camera, label: "快照" },
            { key: "terminal", icon: Terminal, label: "终端" },
            ...(isVM ? [{ key: "console" as const, icon: Monitor, label: "控制台" }] : []),
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className={isTerminalTab ? "flex-1 min-h-0" : ""}>
          <div className={activeTab !== "overview" ? "hidden" : undefined}>
            <OverviewTab instance={instance} onRefresh={refreshInstance} />
          </div>

          {visitedTabs.has("monitor") && (
            <div className={activeTab !== "monitor" ? "hidden" : undefined}>
              <InstanceStatsChart instanceId={Number(id)} />
            </div>
          )}

          {visitedTabs.has("firewall") && (
            <div className={activeTab !== "firewall" ? "hidden" : undefined}>
              <FirewallTab instanceId={Number(id)} />
            </div>
          )}

          {visitedTabs.has("port-forward") && (
            <div className={activeTab !== "port-forward" ? "hidden" : undefined}>
              <PortForwardTab instanceId={Number(id)} />
            </div>
          )}

          {visitedTabs.has("snapshots") && (
            <div className={activeTab !== "snapshots" ? "hidden" : undefined}>
              <SnapshotsTab
                instanceId={Number(id)}
                autoBackup={instance.auto_backup}
                lastBackupAt={instance.last_backup_at}
                onAutoBackupChange={(enabled) => setInstance((prev) => prev ? { ...prev, auto_backup: enabled } : prev)}
              />
            </div>
          )}

          {activeTab === "terminal" && (
            isRunning ? (
              <div className="rounded-2xl bg-background overflow-hidden h-full">
                <WebTerminal
                  wsUrl={`/api/v1/portal/instances/${id}/terminal`}
                  className="h-full"
                  autoRetry
                  onStatusChange={setTerminalStatus}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Terminal className="size-10 text-muted-foreground/25 mb-3" />
                <p className="text-[13px] text-muted-foreground">云服务器未运行，无法连接终端</p>
                {isStopped && (
                  <Button className="mt-4" onClick={() => doPower("start")} disabled={busy}>
                    <Play className="size-3.5" />
                    启动云服务器
                  </Button>
                )}
              </div>
            )
          )}

          {activeTab === "console" && isVM && (
            (isRunning || isRescue) ? (
              <div className="rounded-2xl overflow-hidden h-full">
                <VncConsole
                  wsUrl={`/api/v1/portal/instances/${id}/console`}
                  className="h-full"
                  onStatusChange={setVncStatus}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Monitor className="size-10 text-muted-foreground/25 mb-3" />
                <p className="text-[13px] text-muted-foreground">云服务器未运行，无法连接控制台</p>
                {isStopped && (
                  <Button className="mt-4" onClick={() => doPower("start")} disabled={busy}>
                    <Play className="size-3.5" />
                    启动云服务器
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {ConfirmDialog}

      <AlertDialog open={pendingTab !== null} onOpenChange={(open) => { if (!open) setPendingTab(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>终端会话仍在连接中</AlertDialogTitle>
            <AlertDialogDescription>离开此页面将断开当前终端连接，确定要离开吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const tab = pendingTab!; setPendingTab(null); navigateToTab(tab) }}>
              确认离开
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
