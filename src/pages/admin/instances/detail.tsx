import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  Activity,
  Settings2,
  Camera,
  Terminal,
  Monitor,
  Play,
  Square,
  RotateCw,
  Trash2,
  Plus,
  History,
  Pause,
  Zap,
  ArrowRightLeft,
  Shield,
  Globe,
  Network,
  ArrowUpDown,
  LifeBuoy,
  MoveRight,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  getAdminInstancesById,
  getAdminInstancesByIdSnapshots,
  postAdminInstancesByIdSnapshots,
  postAdminInstancesByIdSnapshotsByNameRestore,
  deleteAdminInstancesByIdSnapshotsByName,
  getAdminIpsFree,
  postAdminInstancesByIdChangeIp,
  postAdminInstancesByIdUnthrottle,
  getAdminInstancesByIdIps,
  deleteAdminInstancesByIdIpsByIpId,
  postAdminInstancesByIdIps,
  putAdminInstancesByIdHa,
} from "@/api"
import type { InstanceInstanceItem, ServiceSnapshotItem, IppoolFreeIpItem, InstanceIpItem } from "@/api"
import { formatBytes, formatMemory, formatDisk, getErrorMessage} from "@/lib/utils"
import { MetricBar } from "@/components/metric-bar"
import { useInstanceState } from "@/hooks/use-instance-state"
import { useInstanceActions } from "@/hooks/use-instance-actions"
import { useTasks } from "@/hooks/use-tasks"
import type { PowerAction } from "@/hooks/use-instance-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { statusMap } from "@/lib/instance-constants"
import { MigrateDialog } from "./components/migrate-dialog"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { WebTerminal } from "@/components/web-terminal"
import type { ConnectionStatus } from "@/components/web-terminal"
import { VncConsole } from "@/components/vnc-console"
import type { VncStatus } from "@/components/vnc-console"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { CopyButton } from "@/components/copy-button"
import { InstanceEditInline } from "./edit-inline"
import { FirewallSection } from "./sections/firewall"
import { PortForwardSection } from "./sections/port-forward"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
const TABS = ["overview", "config", "firewall", "port-forward", "snapshots", "terminal", "console"] as const
type TabValue = (typeof TABS)[number]
const TAB_LABELS: Record<TabValue, string> = {
  overview: "概览",
  config: "配置",
  firewall: "防火墙",
  "port-forward": "端口转发",
  snapshots: "快照",
  terminal: "终端",
  console: "控制台",
}
function resolveTab(pathname: string, id: string, adminPath: string): TabValue {
  const base = `${adminPath}/instances/${id}`
  const sub = pathname.slice(base.length).replace(/^\//, "").split("/")[0]
  if (sub && TABS.includes(sub as TabValue)) return sub as TabValue
  return "overview"
}
function getStatusInfo(status?: string) {
  return statusMap[status ?? ""] ?? { label: status ?? "未知", variant: "outline" as const }
}
function getTypeLabel(type?: string) {
  if (type === "virtual-machine") return "虚拟机"
  if (type === "container") return "容器"
  return type ?? "-"
}
function ChangeIPDialog({
  open,
  onOpenChange,
  instanceId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  instanceId: number
  onSuccess: () => void
}) {
  const [ips, setIps] = useState<IppoolFreeIpItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedIP, setSelectedIP] = useState<IppoolFreeIpItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { addTask } = useTasks()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fetchIPs = useCallback(async (p: number, kw: string, append: boolean) => {
    setLoading(true)
    try {
      const pageSize = 20
      const { data: res } = await getAdminIpsFree({
        query: { page: p, page_size: pageSize, keyword: kw || undefined },
      })
      const data = res?.data as Record<string, unknown> | undefined
      const items: IppoolFreeIpItem[] = (data?.items as IppoolFreeIpItem[]) ?? []
      setIps((prev) => append ? [...prev, ...items] : items)
      setHasMore(items.length >= pageSize)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeyword("")
    setSelectedIP(null)
    fetchIPs(1, "", false)
  }, [open, fetchIPs])
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const handleSearch = useCallback((value: string) => {
    setKeyword(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchIPs(1, value, false)
    }, 300)
  }, [fetchIPs])
  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchIPs(page + 1, keyword, true)
  }, [loading, hasMore, page, keyword, fetchIPs])
  useEffect(() => {
    if (!hasMore || loading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const root = sentinel.closest("[cmdk-list]") as Element | null
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore()
      },
      { root, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, handleLoadMore])
  const handleSubmit = async () => {
    if (!selectedIP?.id) return
    setSubmitting(true)
    try {
      const { data: res } = await postAdminInstancesByIdChangeIp({
        path: { id: instanceId },
        body: { ip_id: selectedIP.id },
      })
      if (res?.code === 0) {
        const taskId = (res.data as Record<string, unknown>)?.task_id as number | undefined
        if (taskId) addTask(taskId, "change_ip")
        toast.success("更换 IP 任务已提交", { description: `新 IP: ${selectedIP.address}` })
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error((res as Record<string, unknown>)?.message as string || "更换 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>更换 IP 地址</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false} disablePointerSelection className="rounded-md border">
          <CommandInput
            placeholder="搜索 IP 地址或池名称..."
            value={keyword}
            onValueChange={handleSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {loading ? "搜索中..." : "未找到匹配的空闲 IP"}
            </CommandEmpty>
            <CommandGroup>
              {ips.map((ip) => (
                <CommandItem
                  key={ip.id}
                  value={String(ip.id)}
                  data-checked={ip.id === selectedIP?.id}
                  onSelect={() => setSelectedIP(ip)}
                >
                  <span className="font-mono font-medium">{ip.address}</span>
                  <span className="text-xs text-muted-foreground">
                    {ip.pool_name} · {ip.pool_type?.toUpperCase()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {hasMore && (
              <>
                <div ref={sentinelRef} className="h-1" />
                <div className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    disabled={loading}
                    onClick={handleLoadMore}
                  >
                    {loading ? <Spinner /> : "加载更多"}
                  </Button>
                </div>
              </>
            )}
          </CommandList>
        </Command>
        {selectedIP && (
          <p className="text-sm">
            已选择: <span className="font-mono font-medium">{selectedIP.address}</span>
            <span className="text-muted-foreground"> · {selectedIP.pool_name}</span>
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!selectedIP || submitting}>
            {submitting && <Spinner />}
            确认更换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function AdminIpList({ instanceId, onRefresh }: { instanceId: number; onRefresh: () => void }) {
  const [ips, setIps] = useState<InstanceIpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removeConfirm, setRemoveConfirm] = useState<InstanceIpItem | null>(null)
  const [removing, setRemoving] = useState(false)
  const { addTask } = useTasks()
  const fetchIps = useCallback(async () => {
    try {
      const { data: res } = await getAdminInstancesByIdIps({ path: { id: instanceId } })
      const items = (res?.data as InstanceIpItem[] | undefined) ?? []
      setIps(items)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [instanceId])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIps()
  }, [fetchIps])
  const handleRemove = async () => {
    if (!removeConfirm?.id) return
    setRemoving(true)
    try {
      const { data: res } = await deleteAdminInstancesByIdIpsByIpId({
        path: { id: instanceId, ipId: removeConfirm.id! },
      })
      if (res?.code === 0) {
        const taskId = (res.data as Record<string, unknown>)?.task_id as number | undefined
        if (taskId) addTask(taskId, "remove_ip")
        toast.success("IP 已移除")
        setRemoveConfirm(null)
        fetchIps()
        onRefresh()
      } else {
        toast.error(res?.message || "移除 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "移除 IP 失败"))
    } finally {
      setRemoving(false)
    }
  }
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    )
  }
  if (ips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Network className="size-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">暂无 IP 地址</p>
      </div>
    )
  }
  return (
    <>
      <div className="space-y-2">
        {ips.map((ip) => (
          <div
            key={ip.id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Globe className="size-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium font-mono text-sm">{ip.address}</span>
                  {ip.is_primary && (
                    <Badge variant="secondary" className="text-[10px]">主 IP</Badge>
                  )}
                </div>
                {ip.pool_name && (
                  <div className="text-xs text-muted-foreground mt-0.5">{ip.pool_name}</div>
                )}
              </div>
            </div>
            {!ip.is_primary && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setRemoveConfirm(ip)}
              >
                <Trash2 className="size-4" />
                移除
              </Button>
            )}
          </div>
        ))}
      </div>
      <AlertDialog open={removeConfirm !== null} onOpenChange={(open) => { if (!open) setRemoveConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除 IP</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从该实例移除 IP 地址 <span className="font-mono font-medium">{removeConfirm?.address}</span> 吗？IP 将回归空闲池。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing && <Spinner />}
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
function AdminAddIpDialog({
  open,
  onOpenChange,
  instanceId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  instanceId: number
  onSuccess: () => void
}) {
  const [ips, setIps] = useState<IppoolFreeIpItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedIP, setSelectedIP] = useState<IppoolFreeIpItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { addTask } = useTasks()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fetchIPs = useCallback(async (p: number, kw: string, append: boolean) => {
    setLoading(true)
    try {
      const pageSize = 20
      const { data: res } = await getAdminIpsFree({
        query: { page: p, page_size: pageSize, keyword: kw || undefined },
      })
      const data = res?.data as Record<string, unknown> | undefined
      const items: IppoolFreeIpItem[] = (data?.items as IppoolFreeIpItem[]) ?? []
      setIps((prev) => append ? [...prev, ...items] : items)
      setHasMore(items.length >= pageSize)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeyword("")
    setSelectedIP(null)
    fetchIPs(1, "", false)
  }, [open, fetchIPs])
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const handleSearch = useCallback((value: string) => {
    setKeyword(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchIPs(1, value, false)
    }, 300)
  }, [fetchIPs])
  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    fetchIPs(page + 1, keyword, true)
  }, [loading, hasMore, page, keyword, fetchIPs])
  useEffect(() => {
    if (!hasMore || loading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const root = sentinel.closest("[cmdk-list]") as Element | null
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore()
      },
      { root, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, handleLoadMore])
  const handleSubmit = async () => {
    if (!selectedIP?.id) return
    setSubmitting(true)
    try {
      const { data: res } = await postAdminInstancesByIdIps({
        path: { id: instanceId },
        body: { ip_id: selectedIP.id },
      })
      if (res?.code === 0) {
        const taskId = (res.data as Record<string, unknown>)?.task_id as number | undefined
        if (taskId) addTask(taskId, "add_ip")
        toast.success("添加 IP 任务已提交", { description: `IP: ${selectedIP.address}` })
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res?.message || "添加 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加 IP 地址</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false} disablePointerSelection className="rounded-md border">
          <CommandInput
            placeholder="搜索 IP 地址或池名称..."
            value={keyword}
            onValueChange={handleSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {loading ? "搜索中..." : "未找到匹配的空闲 IP"}
            </CommandEmpty>
            <CommandGroup>
              {ips.map((ip) => (
                <CommandItem
                  key={ip.id}
                  value={String(ip.id)}
                  data-checked={ip.id === selectedIP?.id}
                  onSelect={() => setSelectedIP(ip)}
                >
                  <span className="font-mono font-medium">{ip.address}</span>
                  <span className="text-xs text-muted-foreground">
                    {ip.pool_name} · {ip.pool_type?.toUpperCase()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {hasMore && (
              <>
                <div ref={sentinelRef} className="h-1" />
                <div className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    disabled={loading}
                    onClick={handleLoadMore}
                  >
                    {loading ? <Spinner /> : "加载更多"}
                  </Button>
                </div>
              </>
            )}
          </CommandList>
        </Command>
        {selectedIP && (
          <p className="text-sm">
            已选择: <span className="font-mono font-medium">{selectedIP.address}</span>
            <span className="text-muted-foreground"> · {selectedIP.pool_name}</span>
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!selectedIP || submitting}>
            {submitting && <Spinner />}
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function OverviewTab({ instance, onRefresh }: { instance: InstanceInstanceItem; onRefresh: () => void }) {
  const formatDate = useFormatDate()
  const [changeIPOpen, setChangeIPOpen] = useState(false)
  const [addIpOpen, setAddIpOpen] = useState(false)
  const [ipListKey, setIpListKey] = useState(0)
  const [unthrottling, setUnthrottling] = useState(false)
  const status = getStatusInfo(instance.status)
  const isRunning = instance.status === "running"
  const state = useInstanceState(instance.id, isRunning)
  const doUnthrottle = async () => {
    setUnthrottling(true)
    try {
      const { data: res } = await postAdminInstancesByIdUnthrottle({ path: { id: instance.id! } })
      if (res?.code === 0) {
        toast.success("解除限速任务已提交")
        onRefresh()
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setUnthrottling(false)
    }
  }
  const handleToggleHA = async (enabled: boolean) => {
    try {
      const { data: res } = await putAdminInstancesByIdHa({
        path: { id: instance.id! },
        body: { enabled },
      })
      if (res?.code === 0) {
        toast.success(enabled ? "已开启高可用保护" : "已关闭高可用保护")
        onRefresh()
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    }
  }
  const trafficPercent = instance.traffic_limit
    ? Math.min(((instance.traffic_used ?? 0) / instance.traffic_limit) * 100, 100)
    : 0
  const memPercent = state?.mem_total ? ((state.mem_used ?? 0) / state.mem_total) * 100 : 0
  const diskPercent = state?.disk_total ? ((state.disk_used ?? 0) / state.disk_total) * 100 : 0
  return (
    <div className="space-y-0">
      {isRunning && (
        <>
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">运行状态</h3>
              <p className="text-sm text-muted-foreground mt-1">
                实时资源使用情况
                {state?.uptime && <span> · 已运行 {state.uptime}</span>}
              </p>
            </div>
            {state ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 max-w-3xl">
                  <MetricBar
                    label="CPU"
                    percent={0}
                    value={`${((state.cpu_usage ?? 0) / 1e9).toFixed(2)}s`}
                    sub={`${instance.cpu ?? 0} 核心`}
                  />
                  <MetricBar
                    label="内存"
                    percent={memPercent}
                    value={`${formatBytes(state.mem_used ?? 0)} / ${formatMemory(instance.memory ?? 0)}`}
                    sub={`${Math.round(memPercent)}% 使用率`}
                  />
                  {(state.disk_used || state.disk_total || instance.disk) ? (
                    <MetricBar
                      label="系统盘"
                      percent={diskPercent}
                      value={`${formatBytes(state.disk_used ?? 0)} / ${formatDisk(instance.disk ?? 0)}`}
                      sub={state.disk_total ? `${Math.round(diskPercent)}% 使用率` : '用量暂不可用'}
                    />
                  ) : null}
                  {state.volumes?.map((vol) => {
                    const pct = vol.total ? ((vol.used ?? 0) / vol.total) * 100 : 0
                    return (
                      <MetricBar
                        key={vol.name}
                        label={`存储卷 ${vol.name}`}
                        percent={pct}
                        value={`${formatBytes(vol.used ?? 0)} / ${formatBytes(vol.total ?? 0)}`}
                        sub={`${Math.round(pct)}% 使用率`}
                      />
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 text-sm max-w-3xl">
                  <div>
                    <div className="text-muted-foreground">网络接收</div>
                    <div className="font-medium font-mono mt-0.5">{formatBytes(state.net_rx ?? 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">网络发送</div>
                    <div className="font-medium font-mono mt-0.5">{formatBytes(state.net_tx ?? 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">进程数</div>
                    <div className="font-medium tabular-nums mt-0.5">{state.processes ?? 0}</div>
                  </div>
                  {state.mem_swap_used ? (
                    <div>
                      <div className="text-muted-foreground">Swap 使用</div>
                      <div className="font-medium font-mono mt-0.5">{formatBytes(state.mem_swap_used)}</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-muted-foreground">PID</div>
                    <div className="font-medium tabular-nums mt-0.5">{state.pid ?? "-"}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 max-w-3xl">
                {["CPU", "内存", "磁盘"].map(label => (
                  <div key={label} className="space-y-1">
                    <Skeleton className="h-3.5 w-10" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <Separator className="my-8" />
        </>
      )}
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">资源配额</h3>
          <p className="text-sm text-muted-foreground mt-1">实例的资源分配情况</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">CPU</div>
            <div className="text-2xl font-bold tabular-nums">{instance.cpu ?? 0}</div>
            <div className="text-xs text-muted-foreground">核心</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">内存</div>
            <div className="text-2xl font-bold tabular-nums">{formatMemory(instance.memory ?? 0)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">磁盘</div>
            <div className="text-2xl font-bold tabular-nums">{formatDisk(instance.disk ?? 0)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">带宽</div>
            <div className="text-2xl font-bold tabular-nums">
              {instance.bandwidth ? `${instance.bandwidth} Mbps` : "不限"}
            </div>
          </div>
        </div>
        {(instance.traffic_limit ?? 0) > 0 && (
          <div className="max-w-md space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                流量使用
                {instance.traffic_throttled && (
                  <span className="ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">已限速</span>
                )}
              </span>
              <span className="text-sm tabular-nums font-medium">
                {formatDisk(instance.traffic_used ?? 0)} / {formatDisk(instance.traffic_limit ?? 0)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${instance.traffic_throttled ? "bg-amber-500" : trafficPercent >= 80 ? "bg-orange-500" : "bg-primary"}`}
                style={{ width: `${trafficPercent}%` }}
              />
            </div>
            {instance.traffic_throttled && (
              <Button variant="outline" onClick={doUnthrottle} disabled={unthrottling} className="mt-2">
                {unthrottling && <Spinner />}
                解除限速
              </Button>
            )}
          </div>
        )}
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">基本信息</h3>
          <p className="text-sm text-muted-foreground mt-1">实例的详细属性</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
          <div>
            <div className="text-muted-foreground">实例名称</div>
            <div className="font-medium mt-0.5">{instance.name || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">主机名</div>
            <div className="font-medium mt-0.5">{state?.os_info?.hostname || instance.hostname || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">类型</div>
            <div className="font-medium mt-0.5">{getTypeLabel(instance.type)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">架构</div>
            <div className="font-medium mt-0.5">{instance.arch || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">状态</div>
            <div className="mt-1">
              <Badge variant={status.variant}>
                {instance.status === "creating" && <Spinner size="sm" />}
                {status.label}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">操作系统</div>
            <div className="font-medium mt-0.5">
              {state?.os_info ? [state.os_info.os, state.os_info.os_version].filter(Boolean).join(" ") || "-" : (instance.os_type || "-")}
            </div>
          </div>
          {state?.os_info?.kernel_version && (
            <div>
              <div className="text-muted-foreground">内核版本</div>
              <div className="font-medium mt-0.5">{state.os_info.kernel_version}</div>
            </div>
          )}
        </div>
        {instance.node_group_id && (
          <div className="flex items-center gap-3 max-w-2xl pt-2">
            <Switch
              checked={instance.ha_enabled ?? false}
              onCheckedChange={handleToggleHA}
            />
            <div className="text-sm">
              <span className="font-medium">高可用保护</span>
              <span className="text-muted-foreground ml-2">开启后节点故障时自动触发整机疏散</span>
            </div>
          </div>
        )}
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">网络信息</h3>
            <p className="text-sm text-muted-foreground mt-1">IP 地址和网络配置</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setAddIpOpen(true)}
            >
              <Plus className="size-4" />
              添加 IP
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    disabled={instance.status !== "stopped"}
                    onClick={() => setChangeIPOpen(true)}
                  >
                    <ArrowRightLeft className="size-4" />
                    更换主 IP
                  </Button>
                </span>
              </TooltipTrigger>
              {instance.status !== "stopped" && (
                <TooltipContent>需要先停止实例才能更换 IP</TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
        <AdminIpList key={ipListKey} instanceId={instance.id!} onRefresh={onRefresh} />
        <ChangeIPDialog
          open={changeIPOpen}
          onOpenChange={setChangeIPOpen}
          instanceId={instance.id!}
          onSuccess={() => { onRefresh(); setIpListKey((k) => k + 1) }}
        />
        <AdminAddIpDialog
          open={addIpOpen}
          onOpenChange={setAddIpOpen}
          instanceId={instance.id!}
          onSuccess={() => { onRefresh(); setIpListKey((k) => k + 1) }}
        />
        {instance.nat_info && (
          <>
            <div className="pt-4">
              <h4 className="text-sm font-medium mb-3">NAT 信息</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
                <div>
                  <div className="text-muted-foreground">共享 IP</div>
                  <div className="font-medium font-mono mt-0.5">{instance.nat_info.shared_ip_address || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">SSH 端口</div>
                  <div className="font-medium font-mono mt-0.5">{instance.nat_info.ssh_port ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">可用端口</div>
                  <div className="font-medium font-mono mt-0.5">
                    {instance.nat_info.port_start != null && instance.nat_info.port_end != null
                      ? `${instance.nat_info.port_start + 1} - ${instance.nat_info.port_end}`
                      : "-"}
                  </div>
                </div>
                {instance.nat_info.ssh_command && (
                  <div className="col-span-2 sm:col-span-3">
                    <div className="text-muted-foreground">SSH 命令</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{instance.nat_info.ssh_command}</code>
                      <CopyButton value={instance.nat_info.ssh_command} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
      {(() => {
        const volumes = Object.entries(instance.devices ?? {}).filter(
          ([name, d]) => d.type === "disk" && name !== "root" && d.source,
        )
        if (volumes.length === 0) return null
        return (
          <>
            <Separator className="my-8" />
            <section className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">存储卷</h3>
                <p className="text-sm text-muted-foreground mt-1">已挂载的附加存储卷</p>
              </div>
              {volumes.map(([name, d]) => (
                <div key={name} className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 text-sm max-w-2xl">
                  <div>
                    <div className="text-muted-foreground">设备名称</div>
                    <div className="font-medium mt-0.5">{name}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">存储卷</div>
                    <div className="font-medium mt-0.5">{d.source}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">挂载路径</div>
                    <div className="font-medium font-mono mt-0.5">{d.path || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">类型</div>
                    <div className="font-medium mt-0.5">{d.path ? "文件系统" : "块设备"}</div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )
      })()}
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">关联信息</h3>
          <p className="text-sm text-muted-foreground mt-1">所属节点和镜像来源</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
          <div>
            <div className="text-muted-foreground">所属节点</div>
            <div className="font-medium mt-0.5">{instance.node_name || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">镜像</div>
            <div className="font-medium mt-0.5">{instance.source_alias || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">描述</div>
            <div className="font-medium mt-0.5">{instance.description || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">创建时间</div>
            <div className="font-medium mt-0.5">{formatDate(instance.created_at)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">到期时间</div>
            <div className="font-medium mt-0.5">{instance.expire_at ? formatDate(instance.expire_at) : "永不过期"}</div>
          </div>
        </div>
      </section>
    </div>
  )
}
function SnapshotsTab({ instanceId }: { instanceId: number }) {
  const formatDate = useFormatDate()
  const [snapshots, setSnapshots] = useState<ServiceSnapshotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState("")
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { addTask } = useTasks()
  const fetchSnapshots = useCallback(async () => {
    try {
      const { data: res } = await getAdminInstancesByIdSnapshots({
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSnapshots()
  }, [fetchSnapshots])
  const handleCreate = async () => {
    if (!snapshotName.trim()) return
    setCreating(true)
    try {
      const { data: res } = await postAdminInstancesByIdSnapshots({
        path: { id: instanceId },
        body: { name: snapshotName.trim() },
      })
      if (res?.code === 0) {
        const taskId = (res.data as Record<string, unknown>)?.task_id as number | undefined
        if (taskId) addTask(taskId, "snapshot_create")
        toast.success("创建快照任务已提交")
        setCreateOpen(false)
        setSnapshotName("")
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
      const { data: res } = await postAdminInstancesByIdSnapshotsByNameRestore({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        const taskId = (res.data as Record<string, unknown>)?.task_id as number | undefined
        if (taskId) addTask(taskId, "snapshot_restore")
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
      const { data: res } = await deleteAdminInstancesByIdSnapshotsByName({
        path: { id: instanceId, name },
      })
      if (res?.code === 0) {
        const taskId = (res.data as Record<string, unknown>)?.task_id as number | undefined
        if (taskId) addTask(taskId, "snapshot_delete")
        toast.success("删除快照任务已提交")
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
    return <InstanceSnapshotsSkeleton />
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">快照管理</h3>
          <p className="text-sm text-muted-foreground mt-1">创建和管理实例的时间点快照</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          创建快照
        </Button>
      </div>
      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Camera className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">暂无快照</p>
          <p className="text-xs text-muted-foreground mt-1">快照可以保存实例当前状态，便于后续恢复</p>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div
              key={snap.name}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Camera className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{snap.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(snap.created_at)}
                    {snap.stateful && " · 包含运行状态"}
                    {snap.expires_at && ` · 过期: ${formatDate(snap.expires_at)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  disabled={actionLoading === snap.name}
                  onClick={() => setRestoreConfirm(snap.name!)}
                >
                  {actionLoading === snap.name ? (
                    <Spinner />
                  ) : (
                    <History className="size-4" />
                  )}
                  恢复
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={actionLoading === snap.name}
                  onClick={() => setDeleteConfirm(snap.name!)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
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
              确定要将实例恢复到快照 &ldquo;{restoreConfirm}&rdquo; 的状态吗？当前实例数据将被覆盖。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreConfirm && handleRestore(restoreConfirm)}
            >
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除快照</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除快照 &ldquo;{deleteConfirm}&rdquo; 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
function InstanceOverviewSkeleton() {
  return (
    <div className="space-y-0">
      <section className="space-y-5">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-36 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-40 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 max-w-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-36 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 max-w-2xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
function InstanceSnapshotsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40 mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="size-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
function DetailSkeleton({ tab }: { tab: TabValue }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-52 mt-0.5" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <Tabs value={tab} className="overflow-hidden shrink-0 pointer-events-none">
        <div className="overflow-x-auto no-scrollbar">
          <TabsList variant="line">
            <TabsTrigger value="overview"><Activity className="size-4" />{TAB_LABELS.overview}</TabsTrigger>
            <TabsTrigger value="config"><Settings2 className="size-4" />{TAB_LABELS.config}</TabsTrigger>
            <TabsTrigger value="firewall"><Shield className="size-4" />{TAB_LABELS.firewall}</TabsTrigger>
            <TabsTrigger value="port-forward"><ArrowUpDown className="size-4" />{TAB_LABELS["port-forward"]}</TabsTrigger>
            <TabsTrigger value="snapshots"><Camera className="size-4" />{TAB_LABELS.snapshots}</TabsTrigger>
            <TabsTrigger value="terminal"><Terminal className="size-4" />{TAB_LABELS.terminal}</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
      <div className="mt-4">
        {tab === "overview" && <InstanceOverviewSkeleton />}
        {tab === "config" && (
          <div className="space-y-6 max-w-2xl">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        )}
        {tab === "snapshots" && <InstanceSnapshotsSkeleton />}
      </div>
    </div>
  )
}
export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const adminPath = useAdminPath()
  const [instance, setInstance] = useState<InstanceInstanceItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [terminalStatus, setTerminalStatus] = useState<ConnectionStatus>("connecting")
  const [vncStatus, setVncStatus] = useState<VncStatus>("connecting")
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [migrateOpen, setMigrateOpen] = useState(false)
  const activeTab = id ? resolveTab(location.pathname, id, adminPath) : "overview"
  const visitedRef = useRef(new Set<TabValue>(["overview", activeTab]))
  const terminalConnected = (activeTab === "terminal" && terminalStatus === "connected") ||
    (activeTab === "console" && vncStatus === "connected")
  const fetchInstance = useCallback(
    async (silent = false) => {
      if (!id) return
      if (!silent) setLoading(true)
      try {
        const { data: res } = await getAdminInstancesById({ path: { id: Number(id) } })
        if (res?.code === 0 && res.data) {
          setInstance(res.data as InstanceInstanceItem)
        } else if (!silent) {
          navigate(`${adminPath}/instances`, { replace: true })
        }
      } catch {
        if (!silent) navigate(`${adminPath}/instances`, { replace: true })
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id, navigate, adminPath],
  )
  const refreshInstance = useCallback(() => fetchInstance(true), [fetchInstance])
  const { handleDelete: handleDeleteAction, handlePowerAction, loadingId, ConfirmDialog } = useInstanceActions(refreshInstance)
  const busy = loadingId === Number(id)
  useBreadcrumb([
    { label: "实例管理", href: `${adminPath}/instances` },
    { label: instance?.name ?? "详情", href: `${adminPath}/instances/${id}` },
    ...(activeTab !== "overview" ? [{ label: TAB_LABELS[activeTab] }] : []),
  ])
  const navigateToTab = useCallback(
    (tab: string) => {
      visitedRef.current.add(tab as TabValue)
      if (tab === "overview") {
        navigate(`${adminPath}/instances/${id}`)
      } else {
        navigate(`${adminPath}/instances/${id}/${tab}`)
      }
    },
    [id, navigate, adminPath],
  )
  const handleTabChange = (tab: string) => {
    if (terminalConnected && tab !== "terminal") {
      setPendingTab(tab)
      return
    }
    navigateToTab(tab)
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInstance(false)
  }, [fetchInstance])
  const doPower = (action: PowerAction) => {
    if (!instance) return
    handlePowerAction(instance, action)
  }
  const doDelete = async () => {
    if (!instance) return
    const deleted = await handleDeleteAction(instance)
    if (deleted) navigate(`${adminPath}/instances`, { replace: true })
  }
  if (loading) return <DetailSkeleton tab={activeTab} />
  if (!instance) return null
  const status = getStatusInfo(instance.status)
  const isRunning = instance.status === "running"
  const isStopped = instance.status === "stopped"
  const isFrozen = instance.status === "frozen"
  const isRescue = instance.status === "rescue"
  const isVM = instance.type === "virtual-machine"
  const isTerminalTab = activeTab === "terminal" || activeTab === "console"
  return (
    <>
      <div className={isTerminalTab ? "flex flex-col flex-1 min-h-0 px-6 pt-6 gap-6" : "px-6 pt-6 space-y-6"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{instance.name}</h1>
              <Badge variant={status.variant}>
                {(instance.status === "creating" || busy) && <Spinner size="sm" />}
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {instance.ip_address || "无 IP"} · {instance.node_name || "未知节点"}
              {instance.arch ? ` · ${instance.arch}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(isStopped || isFrozen) && (
              <Button onClick={() => doPower("start")} disabled={busy}>
                {busy ? <Spinner /> : <Play className="size-4" />}
                启动
              </Button>
            )}
            {isFrozen && (
              <Button variant="outline" onClick={() => doPower("unfreeze")} disabled={busy}>
                {busy ? <Spinner /> : <Play className="size-4" />}
                解冻
              </Button>
            )}
            {isRunning && (
              <>
                <Button variant="outline" onClick={() => doPower("restart")} disabled={busy}>
                  {busy ? <Spinner /> : <RotateCw className="size-4" />}
                  <span className="hidden sm:inline">重启</span>
                </Button>
                <Button variant="outline" onClick={() => doPower("stop")} disabled={busy}>
                  {busy ? <Spinner /> : <Square className="size-4" />}
                  <span className="hidden sm:inline">停止</span>
                </Button>
                <Button variant="outline" onClick={() => doPower("freeze")} disabled={busy}>
                  {busy ? <Spinner /> : <Pause className="size-4" />}
                  <span className="hidden sm:inline">冻结</span>
                </Button>
              </>
            )}
            {(isRunning || isFrozen) && (
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => doPower("force-stop")} disabled={busy}>
                {busy ? <Spinner /> : <Zap className="size-4" />}
                <span className="hidden sm:inline">强制停止</span>
              </Button>
            )}
            {isRescue && (
              <Button variant="outline" onClick={() => doPower("unrescue")} disabled={busy}>
                {busy ? <Spinner /> : <LifeBuoy className="size-4" />}
                退出救援
              </Button>
            )}
            {!isRescue && isVM && (isStopped || isRunning) && (
              <Button variant="outline" onClick={() => doPower("rescue")} disabled={busy}>
                {busy ? <Spinner /> : <LifeBuoy className="size-4" />}
                <span className="hidden sm:inline">救援模式</span>
              </Button>
            )}
            {isStopped && (
              <Button variant="outline" onClick={() => setMigrateOpen(true)} disabled={busy}>
                {busy ? <Spinner /> : <MoveRight className="size-4" />}
                <span className="hidden sm:inline">迁移</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={isRunning || busy}
              onClick={doDelete}
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">删除</span>
            </Button>
          </div>
        </div>
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="overflow-hidden shrink-0">
          <div className="overflow-x-auto no-scrollbar">
            <TabsList variant="line">
              <TabsTrigger value="overview">
                <Activity className="size-4" />
                {TAB_LABELS.overview}
              </TabsTrigger>
              <TabsTrigger value="config">
                <Settings2 className="size-4" />
                {TAB_LABELS.config}
              </TabsTrigger>
              <TabsTrigger value="firewall">
                <Shield className="size-4" />
                {TAB_LABELS.firewall}
              </TabsTrigger>
              <TabsTrigger value="port-forward">
                <ArrowUpDown className="size-4" />
                {TAB_LABELS["port-forward"]}
              </TabsTrigger>
              <TabsTrigger value="snapshots">
                <Camera className="size-4" />
                {TAB_LABELS.snapshots}
              </TabsTrigger>
              <TabsTrigger value="terminal">
                <Terminal className="size-4" />
                {TAB_LABELS.terminal}
              </TabsTrigger>
              {isVM && (
                <TabsTrigger value="console">
                  <Monitor className="size-4" />
                  {TAB_LABELS.console}
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </Tabs>
        {/* Tab Content */}
        <div className={isTerminalTab ? "flex-1 min-h-0" : "mt-4"}>
          <div className={activeTab !== "overview" ? "hidden" : undefined}>
            <OverviewTab instance={instance} onRefresh={refreshInstance} />
          </div>
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("config") && (
            <div className={activeTab !== "config" ? "hidden" : undefined}>
              <InstanceEditInline
                instanceId={Number(id)}
                instance={instance}
                onSuccess={refreshInstance}
              />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("firewall") && (
            <div className={activeTab !== "firewall" ? "hidden" : undefined}>
              <FirewallSection instanceId={Number(id)} />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("port-forward") && (
            <div className={activeTab !== "port-forward" ? "hidden" : undefined}>
              <PortForwardSection instanceId={Number(id)} isNAT={!!instance.nat_info} />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("snapshots") && (
            <div className={activeTab !== "snapshots" ? "hidden" : undefined}>
              <SnapshotsTab instanceId={Number(id)} />
            </div>
          )}
          {activeTab === "terminal" && (
            isRunning ? (
              <WebTerminal
                wsUrl={`/api/v1/admin/instances/${id}/terminal`}
                className="h-full"
                autoRetry
                onStatusChange={setTerminalStatus}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Terminal className="size-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">实例未运行，无法连接终端</p>
                {(isStopped || isFrozen) && (
                  <Button
                    className="mt-4"
                    onClick={() => doPower("start")}
                    disabled={busy}
                  >
                    <Play className="size-4" />
                    启动实例
                  </Button>
                )}
              </div>
            )
          )}
          {activeTab === "console" && isVM && (
            (isRunning || isRescue) ? (
              <VncConsole
                wsUrl={`/api/v1/admin/instances/${id}/console`}
                className="h-full"
                onStatusChange={setVncStatus}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Monitor className="size-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">实例未运行，无法连接控制台</p>
                {(isStopped || isFrozen) && (
                  <Button
                    className="mt-4"
                    onClick={() => doPower("start")}
                    disabled={busy}
                  >
                    <Play className="size-4" />
                    启动实例
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      </div>
      {ConfirmDialog}
      {instance && (
        <MigrateDialog
          open={migrateOpen}
          onOpenChange={setMigrateOpen}
          instanceId={instance.id!}
          instanceName={instance.name ?? ""}
          currentNodeId={instance.node_id!}
          onSuccess={refreshInstance}
        />
      )}
      {/* Terminal Leave Confirmation */}
      <AlertDialog open={pendingTab !== null} onOpenChange={(open) => { if (!open) setPendingTab(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>终端会话仍在连接中</AlertDialogTitle>
            <AlertDialogDescription>
              离开此页面将断开当前终端连接，确定要离开吗？
            </AlertDialogDescription>
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
