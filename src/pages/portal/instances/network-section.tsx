import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Globe, Network, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  putPortalInstancesByIdIpsByIpIdRdns,
  postPortalInstancesByIdIpsPurchase,
  postPortalInstancesByIdIpsChange,
  deletePortalInstancesByIdIpsByIpId,
} from "@/api"
import {
  getPortalInstancesByIdIpsOptions,
  getPortalInstancesByIdIpsQueryKey,
  getPortalInstancesByIdRdnsOptions,
  getPortalInstancesByIdRdnsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import type { PortalPortalInstanceItem, EntityRdns, PortalPortalIpItem } from "@/api"
import { Badge } from "@/components/ui/badge"
import { getErrorMessage } from "@/lib/utils"
import { usePortalTasks } from "@/hooks/use-portal-tasks"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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

export function NetworkSection({ instance, onRefresh }: { instance: PortalPortalInstanceItem; onRefresh: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addTask } = usePortalTasks()
  const instanceBusy = instance.active_task_id != null
  const [purchasing, setPurchasing] = useState(false)
  const [releaseConfirm, setReleaseConfirm] = useState<PortalPortalIpItem | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [changingIP, setChangingIP] = useState(false)
  const [rdnsDialog, setRdnsDialog] = useState<PortalPortalIpItem | null>(null)
  const [rdnsHostname, setRdnsHostname] = useState("")
  const [rdnsSaving, setRdnsSaving] = useState(false)

  const ipsQuery = useQuery({
    ...getPortalInstancesByIdIpsOptions({ path: { id: instance.id ?? 0 } }),
    enabled: !!instance.id,
  })
  // IP 列表加载失败时回退为仅展示主 IP
  const ips = useMemo<PortalPortalIpItem[]>(() => {
    if (ipsQuery.isError) {
      const fallbackAddr = instance.ip_address || instance.ipv6_address
      return fallbackAddr ? [{ id: 0, address: fallbackAddr, is_primary: true }] : []
    }
    return (ipsQuery.data?.data as PortalPortalIpItem[] | undefined) ?? []
  }, [ipsQuery.isError, ipsQuery.data, instance.ip_address, instance.ipv6_address])
  const loading = ipsQuery.isPending

  // rDNS 加载失败不影响主流程（错误静默忽略）
  const rdnsQuery = useQuery({
    ...getPortalInstancesByIdRdnsOptions({ path: { id: instance.id ?? 0 } }),
    enabled: !!instance.id,
  })
  const rdnsMap = useMemo(() => {
    const map: Record<number, EntityRdns> = {}
    const res = rdnsQuery.data
    if (res?.code === 0 && res.data) {
      for (const r of res.data as EntityRdns[]) {
        if (r.ip_id) map[r.ip_id] = r
      }
    }
    return map
  }, [rdnsQuery.data])

  const invalidateIps = () => {
    queryClient.invalidateQueries({ queryKey: getPortalInstancesByIdIpsQueryKey({ path: { id: instance.id ?? 0 } }) })
  }
  const invalidateRdns = () => {
    queryClient.invalidateQueries({ queryKey: getPortalInstancesByIdRdnsQueryKey({ path: { id: instance.id ?? 0 } }) })
  }

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
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, instance.nat_info ? "remove_nat_dedicated_ip" : "remove_ip", instance.id)
        toast.success("释放 IP 任务已提交")
        setReleaseConfirm(null)
        invalidateIps()
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
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, instance.nat_info ? "change_nat_dedicated_ip" : "change_ip", instance.id)
        toast.success("换 IP 任务已提交，请稍候刷新")
        invalidateIps()
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
        invalidateRdns()
      } else {
        toast.error(res?.message || "设置 rDNS 失败")
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
                        disabled={instanceBusy || changingIP}
                      >
                        换 IP
                      </Button>
                    )}
                    {!ip.is_primary && ip.id !== 0 && (
                      <Button
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={instanceBusy}
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
              disabled={instanceBusy || releasing}
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
