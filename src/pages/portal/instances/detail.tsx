import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, useLocation, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  Camera,
  Terminal,
  Play,
  Square,
  RotateCw,
  ArrowLeft,
  LifeBuoy,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  getPortalInstancesByIdOptions,
  getPortalInstancesByIdQueryKey,
  getPortalInstancesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import type { PortalPortalInstanceItem } from "@/api"
import { portalStatusConfig, isIPv6OnlyInstance } from "@/lib/instance-constants"
import { usePortalInstanceActions } from "@/hooks/use-portal-instance-actions"
import { onPortalInstanceChange } from "@/hooks/use-portal-tasks"
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
import { ChartLine, Shield, ArrowUpDown } from "lucide-react"
import { InstanceStatsChart } from "@/components/instance-stats-chart"
// SPICE 协议与 noVNC (RFB) 不兼容，控制台功能暂时移除
import { FirewallTab } from "./firewall-tab"
import { PortForwardTab } from "./port-forward-tab"
import { OverviewTab } from "./overview-tab"
import { SnapshotsTab } from "./snapshots-tab"
import { useSiteName } from "@/hooks/use-site-settings"
import { useDocumentTitle } from '@uidotdev/usehooks'

const TABS = ["overview", "monitor", "firewall", "port-forward", "snapshots", "terminal"] as const
type TabValue = (typeof TABS)[number]

function resolveTab(pathname: string, id: string): TabValue {
  const base = `/portal/servers/${id}`
  const sub = pathname.slice(base.length).replace(/^\//, "").split("/")[0]
  if (sub && TABS.includes(sub as TabValue)) return sub as TabValue
  return "overview"
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
  const queryClient = useQueryClient()
  const [terminalStatus, setTerminalStatus] = useState<ConnectionStatus>("connecting")
  const [pendingTab, setPendingTab] = useState<string | null>(null)

  const activeTab = id ? resolveTab(location.pathname, id) : "overview"
  const [visitedTabs, setVisitedTabs] = useState<Set<TabValue>>(() => new Set(["overview", activeTab]))
  const terminalConnected = activeTab === "terminal" && terminalStatus === "connected"

  const instanceQuery = useQuery({
    ...getPortalInstancesByIdOptions({ path: { id: Number(id) } }),
    enabled: !!id,
  })
  const instanceRes = instanceQuery.data
  const instance = instanceRes?.code === 0 && instanceRes.data
    ? (instanceRes.data as PortalPortalInstanceItem)
    : null

  useDocumentTitle(`${instance?.name ?? "云服务器"} - ${siteName}`)

  // 未解析出实例（instance 仅在响应 code===0 且有 data 时非空），且请求已出错或已有响应
  // （即实例不存在或加载失败且无缓存数据）时返回列表页
  useEffect(() => {
    if (!instance && (instanceQuery.isError || !!instanceRes)) {
      navigate("/portal/servers", { replace: true })
    }
  }, [instance, instanceQuery.isError, instanceRes, navigate])

  // 后台静默刷新实例详情（不闪加载态）
  const invalidateInstance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getPortalInstancesByIdQueryKey({ path: { id: Number(id) } }) })
  }, [queryClient, id])

  // 操作成功后刷新详情，同时失效实例列表缓存
  const refreshInstance = useCallback(() => {
    invalidateInstance()
    queryClient.invalidateQueries({ queryKey: getPortalInstancesQueryKey() })
  }, [invalidateInstance, queryClient])

  const { handlePowerAction, loadingId, ConfirmDialog } = usePortalInstanceActions(refreshInstance)
  const busy = loadingId === Number(id) || instance?.active_task_id != null
  // 追踪当前正在执行的操作，仅在对应按钮上显示 Spinner
  const [activeAction, setActiveAction] = useState<PortalPowerAction | null>(null)

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

  // SSE 事件驱动刷新（防抖合并连续事件）
  useEffect(() => {
    const instanceId = Number(id)
    if (!instanceId) return
    let timer: ReturnType<typeof setTimeout>
    const cleanup = onPortalInstanceChange((changedId) => {
      if (changedId === instanceId) {
        clearTimeout(timer)
        timer = setTimeout(invalidateInstance, 800)
      }
    })
    return () => { clearTimeout(timer); cleanup() }
  }, [id, invalidateInstance])

  const doPower = async (action: PortalPowerAction) => {
    if (!instance) return
    setActiveAction(action)
    try {
      await handlePowerAction(instance, action)
    } finally {
      setActiveAction(null)
    }
  }

  if (instanceQuery.isPending) return <DetailSkeleton />
  if (!instance) return null

  const status = instance.status ?? "stopped"
  const cfg = portalStatusConfig[status] ?? { label: "未知", color: "text-zinc-400", dot: "bg-zinc-400" }
  const isRunning = status === "running"
  const isStopped = status === "stopped" || status === "frozen"
  const isRescue = status === "rescue"
  const isVM = instance.type === "virtual-machine"
  const isTerminalTab = activeTab === "terminal"

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
            <div data-tour="instance-info" className="min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <h1 className="text-xl font-semibold tracking-tight truncate" title={instance.name}>{instance.name}</h1>
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium shrink-0 ${cfg.color}`}>
                  <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                <span className="font-mono">{instance.ip_address || instance.ipv6_address || "未分配 IP"}</span>
                {instance.os_type && <> · {instance.os_type}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-11 sm:ml-0" data-tour="instance-power">
            <Button onClick={() => doPower("start")} disabled={busy || isRunning || isRescue}>
              {activeAction === "start" ? <Spinner /> : <Play className="size-3.5" />}
              启动
            </Button>
            <Button variant="outline" className="bg-background" onClick={() => doPower("restart")} disabled={busy || !(isRunning || isRescue)}>
              {activeAction === "restart" ? <Spinner /> : <RotateCw className="size-3.5" />}
              重启
            </Button>
            <Button variant="outline" className="bg-background" onClick={() => doPower("stop")} disabled={busy || !(isRunning || isRescue)}>
              {activeAction === "stop" ? <Spinner /> : <Square className="size-3.5" />}
              停止
            </Button>
            {isRescue ? (
              <Button variant="outline" className="bg-background" onClick={() => doPower("unrescue")} disabled={busy}>
                {activeAction === "unrescue" ? <Spinner /> : <LifeBuoy className="size-3.5" />}
                退出救援
              </Button>
            ) : isVM ? (
              <Button variant="outline" className="bg-background" onClick={() => doPower("rescue")} disabled={busy || !(isStopped || isRunning)}>
                {activeAction === "rescue" ? <Spinner /> : <LifeBuoy className="size-3.5" />}
                救援模式
              </Button>
            ) : null}
          </div>
        </div>

        {/* Tab */}
        <div className="flex gap-1 rounded-xl bg-background p-1 w-fit" data-tour="instance-tabs">
          {([
            { key: "overview", icon: Activity, label: "概览" },
            { key: "monitor", icon: ChartLine, label: "监控" },
            { key: "firewall", icon: Shield, label: "防火墙" },
            { key: "port-forward", icon: ArrowUpDown, label: "端口转发" },
            { key: "snapshots", icon: Camera, label: "快照" },
            { key: "terminal", icon: Terminal, label: "终端" },
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
              <FirewallTab instanceId={Number(id)} instanceBusy={busy} />
            </div>
          )}

          {visitedTabs.has("port-forward") && (
            <div className={activeTab !== "port-forward" ? "hidden" : undefined}>
              <PortForwardTab instanceId={Number(id)} instanceBusy={busy} isNAT={!!instance.nat_info} isIPv6Only={isIPv6OnlyInstance(instance)} />
            </div>
          )}

          {visitedTabs.has("snapshots") && (
            <div className={activeTab !== "snapshots" ? "hidden" : undefined}>
              <SnapshotsTab
                instanceId={Number(id)}
                instanceBusy={busy}
                autoBackup={instance.auto_backup}
                lastBackupAt={instance.last_backup_at}
                onAutoBackupChange={invalidateInstance}
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
