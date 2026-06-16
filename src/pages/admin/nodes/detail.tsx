import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  FileSliders,
  Globe,
  Activity,
  ChartLine,
  MonitorCog,
  Disc3,
  ScrollText,
  Settings2,
  Database,
  Terminal,
  Plus,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { getAdminNodesById, getAdminNodesByIdInstanceStats, getAdminNodesByIdMetrics, postAdminNodesByIdSync } from "@/api"
import type { NodeNodeItem, NodeMetricPoint } from "@/api"
import { formatBytes, getErrorMessage} from "@/lib/utils"
import { incus } from "@/lib/incus"
import type { IncusStoragePoolDetail } from "@/types/incus"
import { useTasks } from "@/hooks/use-tasks"
import { MetricBar } from "@/components/metric-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogViewer } from "@/components/log-viewer"
import NodeImageTable, { ImageTableSkeleton } from "@/components/node-image-table"
import NodeInstanceTable from "@/components/node-instance-table"
import NodeNetworkTable, { NetworkTableSkeleton } from "@/components/node-network-table"
import NodeProfileTable, { ProfileTableSkeleton } from "@/components/node-profile-table"
import NodeSettings from "@/components/node-settings"
import NodeStats, { StatsContentSkeleton } from "@/components/node-stats"
import NodeStorageTable, { StorageTableSkeleton } from "@/components/node-storage-table"
import { NODE_STATUS, statusMap } from "@/lib/node-constants"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { InstanceCreateSheet } from "@/components/instance-create-sheet"
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

const TABS = ["overview", "stats", "instances", "profiles", "storage", "network", "images", "tasks", "terminal", "settings"] as const

const TAB_LABELS: Record<TabValue, string> = {
  overview: "概览",
  stats: "统计",
  instances: "实例",
  profiles: "配置文件",
  storage: "存储",
  network: "网络",
  images: "镜像",
  tasks: "任务日志",
  terminal: "终端",
  settings: "设置",
}
type TabValue = typeof TABS[number]

function getStatus(node: NodeNodeItem) {
  return statusMap[node.status ?? 0] ?? { label: "未知", variant: "outline" as const }
}

function resolveTab(pathname: string, nodeId: string, adminPath: string): TabValue {
  const base = `${adminPath}/nodes/${nodeId}`
  const sub = pathname.slice(base.length).replace(/^\//, "").split("/")[0]
  if (sub && TABS.includes(sub as TabValue)) return sub as TabValue
  return "overview"
}

function TabPlaceholder({ description }: { description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

interface InstanceStats {
  total: number
  running: number
  stopped: number
  error: number
  creating: number
}

function useInstanceStats(nodeId: number) {
  const [stats, setStats] = useState<InstanceStats>({ total: 0, running: 0, stopped: 0, error: 0, creating: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: res } = await getAdminNodesByIdInstanceStats({ path: { id: nodeId } })
        if (cancelled) return
        const d = res?.data
        const running = d?.running ?? 0
        const stopped = d?.stopped ?? 0
        const error = d?.error ?? 0
        const creating = d?.creating ?? 0
        setStats({ total: running + stopped + error + creating, running, stopped, error, creating })
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [nodeId])

  return stats
}

function useLatestMetrics(nodeId: number, monitorEnabled: boolean) {
  const [latest, setLatest] = useState<NodeMetricPoint | null>(null)

  useEffect(() => {
    if (!monitorEnabled) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: res } = await getAdminNodesByIdMetrics({
          path: { id: nodeId },
          query: { range: "1h" },
        })
        if (cancelled) return
        const points = (res?.data ?? []) as NodeMetricPoint[]
        if (points.length > 0) setLatest(points[points.length - 1])
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [nodeId, monitorEnabled])

  return latest
}

interface PoolUsage {
  name: string
  driver: string
  used: number
  total: number
}

function useStoragePoolUsage(nodeId: number, nodeStatus: number | undefined) {
  const [pools, setPools] = useState<PoolUsage[]>([])

  useEffect(() => {
    if (nodeStatus !== NODE_STATUS.ONLINE) return
    let cancelled = false
    ;(async () => {
      try {
        const poolList = await incus<IncusStoragePoolDetail[]>(nodeId, "1.0/storage-pools", { params: { recursion: "1" } })
        const usages = await Promise.all(
          (poolList ?? []).map(async (pool) => {
            const res = await incus<{ space?: { used: number; total: number } }>(nodeId, `1.0/storage-pools/${pool.name}/resources`).catch(() => null)
            return { name: pool.name, driver: pool.driver, used: res?.space?.used ?? 0, total: res?.space?.total ?? 0 }
          }),
        )
        if (!cancelled) setPools(usages.filter((p) => p.total > 0))
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [nodeId, nodeStatus])

  return pools
}

function OverviewTab({ node }: { node: NodeNodeItem }) {
  const formatDate = useFormatDate()
  const status = getStatus(node)
  const instStats = useInstanceStats(node.id!)
  const latestMetric = useLatestMetrics(node.id!, node.monitor_enabled ?? false)
  const poolUsage = useStoragePoolUsage(node.id!, node.status)

  const hasMetric = !!latestMetric
  const noMonitor = !node.monitor_enabled
  const metricHint = noMonitor ? "监控未启用" : "等待数据"

  const cpuPercent = latestMetric?.cpu_usage ?? 0
  const memPercent = latestMetric?.mem_total
    ? ((latestMetric.mem_used ?? 0) / latestMetric.mem_total) * 100
    : 0
  const diskPercent = latestMetric?.disk_total
    ? ((latestMetric.disk_used ?? 0) / latestMetric.disk_total) * 100
    : 0

  return (
    <div className="space-y-0">
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">概览</h3>
          <p className="text-sm text-muted-foreground mt-1">节点关键指标一览</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">实例总数</div>
            <div className="text-2xl font-bold tabular-nums">{instStats.total}</div>
            {instStats.running > 0 && (
              <div className="text-xs text-muted-foreground">{instStats.running} 运行中</div>
            )}
          </div>
          {hasMetric ? (
            <>
              <MetricBar
                label="CPU"
                percent={cpuPercent}
                value={`${cpuPercent.toFixed(1)}%`}
                sub={latestMetric.cpu_cores ? `${latestMetric.cpu_cores} 核` : undefined}
              />
              <MetricBar
                label="内存"
                percent={memPercent}
                value={`${formatBytes(latestMetric.mem_used ?? 0)} / ${formatBytes(latestMetric.mem_total ?? 0)}`}
                sub={`${Math.round(memPercent)}% 使用率`}
              />
              <MetricBar
                label="磁盘"
                percent={diskPercent}
                value={`${formatBytes(latestMetric.disk_used ?? 0)} / ${formatBytes(latestMetric.disk_total ?? 0)}`}
                sub={`${Math.round(diskPercent)}% 使用率`}
              />
            </>
          ) : (
            ["CPU", "内存", "磁盘"].map(label => (
              <div key={label} className="space-y-1">
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="text-2xl font-bold">-</div>
                <div className="text-xs text-muted-foreground">{metricHint}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {poolUsage.length > 0 && (
        <>
          <Separator className="my-8" />
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">存储池</h3>
              <p className="text-sm text-muted-foreground mt-1">各存储池的空间使用情况</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 max-w-3xl">
              {poolUsage.map((pool) => {
                const pct = pool.total ? (pool.used / pool.total) * 100 : 0
                return (
                  <MetricBar
                    key={pool.name}
                    label={`${pool.name} (${pool.driver})`}
                    percent={pct}
                    value={`${formatBytes(pool.used)} / ${formatBytes(pool.total)}`}
                    sub={`${Math.round(pct)}% 使用率`}
                  />
                )
              })}
            </div>
          </section>
        </>
      )}

      <Separator className="my-8" />

      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">基本信息</h3>
          <p className="text-sm text-muted-foreground mt-1">节点名称、区域和状态</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
          <div>
            <div className="text-muted-foreground">节点名称</div>
            <div className="font-medium mt-0.5">{node.name || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">区域</div>
            <div className="font-medium mt-0.5">{node.region || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">架构</div>
            <div className="font-medium mt-0.5">{node.arch || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">主机地址</div>
            <div className="font-medium font-mono mt-0.5">{node.host}:{node.port}</div>
          </div>
          <div>
            <div className="text-muted-foreground">状态</div>
            <div className="mt-1">
              <Badge variant={status.variant}>
                {node.status === NODE_STATUS.DEPLOYING && <Spinner size="sm" />}
                {status.label}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">监控</div>
            <div className="mt-1">
              <Badge variant={node.monitor_enabled ? "default" : "secondary"}>
                {node.monitor_enabled ? "已启用" : "未启用"}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">创建时间</div>
            <div className="font-medium mt-0.5">{formatDate(node.created_at)}</div>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {instStats.total > 0 && (
        <>
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">实例分布</h3>
              <p className="text-sm text-muted-foreground mt-1">各状态的实例数量</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <span className="size-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">运行中</span>
                <span className="font-bold tabular-nums">{instStats.running}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <span className="size-2 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">已停止</span>
                <span className="font-bold tabular-nums">{instStats.stopped}</span>
              </div>
              {instStats.error > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2">
                  <span className="size-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">错误</span>
                  <span className="font-bold tabular-nums">{instStats.error}</span>
                </div>
              )}
              {instStats.creating > 0 && (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="size-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">创建中</span>
                  <span className="font-bold tabular-nums">{instStats.creating}</span>
                </div>
              )}
            </div>
          </section>
          <Separator className="my-8" />
        </>
      )}

      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">连接配置</h3>
          <p className="text-sm text-muted-foreground mt-1">SSH 和服务连接参数</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
          <div>
            <div className="text-muted-foreground">SSH 端口</div>
            <div className="font-medium font-mono mt-0.5">{node.ssh_port ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">SSH 用户</div>
            <div className="font-medium mt-0.5">{node.ssh_user || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">认证方式</div>
            <div className="font-medium mt-0.5">{node.ssh_auth_method === "key" ? "密钥认证" : "密码认证"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">网桥</div>
            <div className="font-medium mt-0.5">{node.network_name || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">存储池</div>
            <div className="font-medium mt-0.5">{node.storage_pool || "-"}</div>
          </div>
        </div>
      </section>

      {(node.status === NODE_STATUS.ERROR || node.status === NODE_STATUS.UNREACHABLE) && node.status_message && (
        <>
          <Separator className="my-8" />
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-destructive">错误信息</h3>
              <p className="text-sm text-muted-foreground mt-1">节点初始化或连接过程中出现的错误</p>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted rounded-lg p-4 font-mono max-w-3xl">
              {node.status_message}
            </pre>
          </section>
        </>
      )}
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-0">
      <section className="space-y-5">
        <div>
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-8 w-10" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-3.5 w-10" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-16" />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatsTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-lg bg-muted p-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-md px-3 py-1">
              <Skeleton className="h-3.5 w-10" />
            </div>
          ))}
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <StatsContentSkeleton />
    </div>
  )
}

function DetailSkeleton({ tab }: { tab: TabValue }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48 mt-0.5" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      <Tabs value={tab} className="overflow-hidden shrink-0 pointer-events-none">
        <div className="overflow-x-auto no-scrollbar">
          <TabsList variant="line">
            <TabsTrigger value="overview"><Activity className="size-4" />{TAB_LABELS.overview}</TabsTrigger>
            <TabsTrigger value="stats"><ChartLine className="size-4" />{TAB_LABELS.stats}</TabsTrigger>
            <TabsTrigger value="instances"><MonitorCog className="size-4" />{TAB_LABELS.instances}</TabsTrigger>
            <TabsTrigger value="profiles"><FileSliders className="size-4" />{TAB_LABELS.profiles}</TabsTrigger>
            <TabsTrigger value="storage"><Database className="size-4" />{TAB_LABELS.storage}</TabsTrigger>
            <TabsTrigger value="network"><Globe className="size-4" />{TAB_LABELS.network}</TabsTrigger>
            <TabsTrigger value="images"><Disc3 className="size-4" />{TAB_LABELS.images}</TabsTrigger>
            <TabsTrigger value="tasks"><ScrollText className="size-4" />{TAB_LABELS.tasks}</TabsTrigger>
            <TabsTrigger value="terminal"><Terminal className="size-4" />{TAB_LABELS.terminal}</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="size-4" />{TAB_LABELS.settings}</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <div className="mt-4">
        {tab === "overview" && <OverviewSkeleton />}
        {tab === "stats" && <StatsTabSkeleton />}
        {tab === "profiles" && <ProfileTableSkeleton />}
        {tab === "images" && <ImageTableSkeleton />}
        {tab === "storage" && <StorageTableSkeleton />}
        {tab === "network" && <NetworkTableSkeleton />}
        {tab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function NodeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const adminPath = useAdminPath()
  const [node, setNode] = useState<NodeNodeItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [instanceSheetOpen, setInstanceSheetOpen] = useState(false)
  const [terminalStatus, setTerminalStatus] = useState<ConnectionStatus>("connecting")
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const { addTask } = useTasks()

  const activeTab = id ? resolveTab(location.pathname, id, adminPath) : "overview"
  const visitedRef = useRef(new Set<TabValue>(["overview", activeTab]))
  const terminalConnected = activeTab === "terminal" && terminalStatus === "connected"

  useBreadcrumb([
    { label: "节点管理", href: `${adminPath}/nodes` },
    { label: node?.name ?? "详情", href: `${adminPath}/nodes/${id}` },
    { label: TAB_LABELS[activeTab] },
  ])

  const navigateToTab = useCallback((tab: string) => {
    visitedRef.current.add(tab as TabValue)
    if (tab === "overview") {
      navigate(`${adminPath}/nodes/${id}`)
    } else {
      navigate(`${adminPath}/nodes/${id}/${tab}`)
    }
  }, [id, navigate, adminPath])

  const handleTabChange = (tab: string) => {
    if (terminalConnected && tab !== "terminal") {
      setPendingTab(tab)
      return
    }
    navigateToTab(tab)
  }

  const fetchNode = useCallback(async (silent = false) => {
    if (!id) return
    if (!silent) setLoading(true)
    try {
      const { data: res } = await getAdminNodesById({ path: { id: Number(id) } })
      if (res?.code === 0 && res.data) {
        setNode(res.data as NodeNodeItem)
      } else if (!silent) {
        navigate(`${adminPath}/nodes`, { replace: true })
      }
    } catch {
      if (!silent) navigate(`${adminPath}/nodes`, { replace: true })
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id, navigate, adminPath])

  const refreshNode = useCallback(() => fetchNode(true), [fetchNode])

  const handleSync = async () => {
    if (!node || syncing) return
    setSyncing(true)
    try {
      const { data: res } = await postAdminNodesByIdSync({ path: { id: node.id! } })
      if (res?.code === 0) {
        const taskId = res.data?.sync_task_id
        if (taskId) addTask(taskId, "sync_node")
        toast.success("同步任务已提交，可在任务日志中查看进度")
        refreshNode()
      } else {
        toast.error(res?.message || "同步失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "同步请求失败"))
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNode(false)
  }, [fetchNode])

  if (loading) return <DetailSkeleton tab={activeTab} />
  if (!node) return null

  const status = getStatus(node)
  const isTerminalTab = activeTab === "terminal"

  return (
    <>
      <div className={isTerminalTab ? "flex flex-col flex-1 min-h-0 px-6 pt-6 gap-6" : "px-6 pt-6 space-y-6"}>
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{node.name}</h1>
                <Badge variant={status.variant}>
                  {node.status === NODE_STATUS.DEPLOYING && <Spinner size="sm" />}
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {node.host} · {node.region || "未设置区域"}{node.arch ? ` · ${node.arch}` : ""}
              </p>
            </div>
          </div>
          {node.status === NODE_STATUS.ONLINE && (
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
              同步资源
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="overflow-hidden shrink-0">
          <div className="overflow-x-auto no-scrollbar">
            <TabsList variant="line">
              <TabsTrigger value="overview"><Activity className="size-4" />{TAB_LABELS.overview}</TabsTrigger>
              <TabsTrigger value="stats"><ChartLine className="size-4" />{TAB_LABELS.stats}</TabsTrigger>
              <TabsTrigger value="instances"><MonitorCog className="size-4" />{TAB_LABELS.instances}</TabsTrigger>
              <TabsTrigger value="profiles"><FileSliders className="size-4" />{TAB_LABELS.profiles}</TabsTrigger>
              <TabsTrigger value="storage"><Database className="size-4" />{TAB_LABELS.storage}</TabsTrigger>
              <TabsTrigger value="network"><Globe className="size-4" />{TAB_LABELS.network}</TabsTrigger>
              <TabsTrigger value="images"><Disc3 className="size-4" />{TAB_LABELS.images}</TabsTrigger>
              <TabsTrigger value="tasks"><ScrollText className="size-4" />{TAB_LABELS.tasks}</TabsTrigger>
              <TabsTrigger value="terminal"><Terminal className="size-4" />{TAB_LABELS.terminal}</TabsTrigger>
              <TabsTrigger value="settings"><Settings2 className="size-4" />{TAB_LABELS.settings}</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        <div className={isTerminalTab ? "flex-1 min-h-0" : "mt-4"}>
          <div className={activeTab !== "overview" ? "hidden" : undefined}>
            <OverviewTab node={node} />
          </div>
          {activeTab === "stats" && (
            <NodeStats
              nodeId={Number(id)}
              monitorEnabled={node.monitor_enabled ?? false}
              onMonitorChange={refreshNode}
            />
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("instances") && (
            <div className={activeTab !== "instances" ? "hidden" : undefined}>
              <NodeInstanceTable
                nodeId={Number(id)}
                toolbar={
                  <Button onClick={() => setInstanceSheetOpen(true)}>
                    <Plus className="size-4" />
                    创建实例
                  </Button>
                }
              />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("profiles") && (
            <div className={activeTab !== "profiles" ? "hidden" : undefined}>
              <NodeProfileTable nodeId={Number(id)} />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("storage") && (
            <div className={activeTab !== "storage" ? "hidden" : undefined}>
              <NodeStorageTable nodeId={Number(id)} />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("network") && (
            <div className={activeTab !== "network" ? "hidden" : undefined}>
              <NodeNetworkTable nodeId={Number(id)} />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("images") && (
            <div className={activeTab !== "images" ? "hidden" : undefined}>
              <NodeImageTable nodeId={Number(id)} />
            </div>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("tasks") && (
            <div className={activeTab !== "tasks" ? "hidden" : undefined}>
              {(node.init_task_id || node.sync_task_id) ? (
                <div className="space-y-6">
                  {node.sync_task_id && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="size-4" />
                        <span>资源同步日志 (Task #{node.sync_task_id})</span>
                      </div>
                      <LogViewer
                        wsUrl={`/api/v1/admin/tasks/${node.sync_task_id}/logs`}
                        className="h-80"
                        onDone={refreshNode}
                      />
                    </div>
                  )}
                  {node.init_task_id && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Terminal className="size-4" />
                        <span>初始化任务日志 (Task #{node.init_task_id})</span>
                        {node.status === NODE_STATUS.DEPLOYING && <Spinner size="sm" />}
                      </div>
                      <LogViewer
                        wsUrl={`/api/v1/admin/tasks/${node.init_task_id}/logs`}
                        className="h-80"
                        onDone={refreshNode}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <TabPlaceholder description="暂无任务日志" />
              )}
            </div>
          )}
          {activeTab === "terminal" && (
            <WebTerminal
              wsUrl={`/api/v1/admin/nodes/${id}/terminal`}
              className="h-full"
              onStatusChange={setTerminalStatus}
            />
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("settings") && (
            <div className={activeTab !== "settings" ? "hidden" : undefined}>
              <NodeSettings node={node} onNodeChange={refreshNode} />
            </div>
          )}
        </div>
      </div>

      <InstanceCreateSheet
        open={instanceSheetOpen}
        onOpenChange={setInstanceSheetOpen}
        nodeId={Number(id)}
        onSuccess={() => setInstanceSheetOpen(false)}
      />

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
            <AlertDialogAction onClick={() => { const tab = pendingTab!; setPendingTab(null); navigateToTab(tab) }}>确认离开</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
