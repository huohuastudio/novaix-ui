import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  Activity,
  Settings2,
  Camera,
  Terminal,
  Play,
  Square,
  RotateCw,
  Trash2,
  Pause,
  Zap,
  Shield,
  ArrowUpDown,
  LifeBuoy,
  MoveRight,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Spinner } from "@/components/ui/spinner"
import type { InstanceInstanceItem } from "@/api"
import {
  getAdminInstancesByIdOptions,
  getAdminInstancesByIdQueryKey,
  getAdminInstancesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { useInstanceActions } from "@/hooks/use-instance-actions"
import type { PowerAction } from "@/hooks/use-instance-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStatusInfo } from "@/lib/instance-constants"
import { MigrateDialog } from "./components/migrate-dialog"
import { OverviewTab, InstanceOverviewSkeleton } from "./sections/overview"
import { SnapshotsTab, InstanceSnapshotsSkeleton } from "./sections/snapshots-tab"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { WebTerminal } from "@/components/web-terminal"
import type { ConnectionStatus } from "@/components/web-terminal"
// SPICE 协议与 noVNC (RFB) 不兼容，控制台功能暂时移除
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
import { InstanceEditInline } from "./edit-inline"
import { FirewallSection } from "./sections/firewall"
import { PortForwardSection } from "./sections/port-forward"
import { useAdminPath } from "@/hooks/use-site-settings"
const TABS = ["overview", "config", "firewall", "port-forward", "snapshots", "terminal"] as const
type TabValue = (typeof TABS)[number]
const TAB_LABELS: Record<TabValue, string> = {
  overview: "概览",
  config: "配置",
  firewall: "防火墙",
  "port-forward": "端口转发",
  snapshots: "快照",
  terminal: "终端",
}
function resolveTab(pathname: string, id: string, adminPath: string): TabValue {
  const base = `${adminPath}/instances/${id}`
  const sub = pathname.slice(base.length).replace(/^\//, "").split("/")[0]
  if (sub && TABS.includes(sub as TabValue)) return sub as TabValue
  return "overview"
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
  const queryClient = useQueryClient()
  const [terminalStatus, setTerminalStatus] = useState<ConnectionStatus>("connecting")
  const [pendingTab, setPendingTab] = useState<string | null>(null)
  const [migrateOpen, setMigrateOpen] = useState(false)
  const activeTab = id ? resolveTab(location.pathname, id, adminPath) : "overview"
  const [visitedTabs, setVisitedTabs] = useState<Set<TabValue>>(() => new Set(["overview", activeTab]))
  const terminalConnected = activeTab === "terminal" && terminalStatus === "connected"

  const instanceQuery = useQuery({
    ...getAdminInstancesByIdOptions({ path: { id: Number(id) } }),
    enabled: !!id,
  })
  const instance: InstanceInstanceItem | null =
    instanceQuery.data?.code === 0 && instanceQuery.data.data
      ? (instanceQuery.data.data as InstanceInstanceItem)
      : null
  const loading = instanceQuery.isPending

  // 加载结束仍无数据（不存在或请求失败）时返回列表页
  useEffect(() => {
    if (!loading && !instance) {
      navigate(`${adminPath}/instances`, { replace: true })
    }
  }, [loading, instance, navigate, adminPath])

  // 操作成功后刷新实例详情缓存，并失效实例列表的全部分页缓存
  const refreshInstance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getAdminInstancesByIdQueryKey({ path: { id: Number(id) } }) })
    queryClient.invalidateQueries({ queryKey: getAdminInstancesQueryKey() })
  }, [queryClient, id])
  const { handleDelete: handleDeleteAction, handlePowerAction, loadingId, ConfirmDialog, ConfirmChoiceDialog } = useInstanceActions(refreshInstance)
  const busy = loadingId === Number(id)
  useBreadcrumb([
    { label: "实例管理", href: `${adminPath}/instances` },
    { label: instance?.name ?? "详情", href: `${adminPath}/instances/${id}` },
    ...(activeTab !== "overview" ? [{ label: TAB_LABELS[activeTab] }] : []),
  ])
  const navigateToTab = useCallback(
    (tab: string) => {
      setVisitedTabs(prev => new Set(prev).add(tab as TabValue))
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
  const isTerminalTab = activeTab === "terminal"
  return (
    <>
      <div className={isTerminalTab ? "flex flex-col flex-1 min-h-0 px-6 pt-6 gap-6" : "px-6 pt-6 space-y-6"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate" title={instance.name}>{instance.name}</h1>
              <Badge variant={status.variant} className="shrink-0">
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
            {(isRunning || isRescue) && (
              <>
                <Button variant="outline" onClick={() => doPower("restart")} disabled={busy}>
                  {busy ? <Spinner /> : <RotateCw className="size-4" />}
                  <span className="hidden sm:inline">重启</span>
                </Button>
                <Button variant="outline" onClick={() => doPower("stop")} disabled={busy}>
                  {busy ? <Spinner /> : <Square className="size-4" />}
                  <span className="hidden sm:inline">停止</span>
                </Button>
                {!isRescue && (
                  <Button variant="outline" onClick={() => doPower("freeze")} disabled={busy}>
                    {busy ? <Spinner /> : <Pause className="size-4" />}
                    <span className="hidden sm:inline">冻结</span>
                  </Button>
                )}
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
              disabled={busy}
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
            </TabsList>
          </div>
        </Tabs>
        {/* Tab Content */}
        <div className={isTerminalTab ? "flex-1 min-h-0" : "mt-4"}>
          <div className={activeTab !== "overview" ? "hidden" : undefined}>
            <OverviewTab instance={instance} onRefresh={refreshInstance} />
          </div>
          {visitedTabs.has("config") && (
            <div className={activeTab !== "config" ? "hidden" : undefined}>
              <InstanceEditInline
                instanceId={Number(id)}
                instance={instance}
                onSuccess={refreshInstance}
              />
            </div>
          )}
          {visitedTabs.has("firewall") && (
            <div className={activeTab !== "firewall" ? "hidden" : undefined}>
              <FirewallSection instanceId={Number(id)} />
            </div>
          )}
          {visitedTabs.has("port-forward") && (
            <div className={activeTab !== "port-forward" ? "hidden" : undefined}>
              <PortForwardSection instanceId={Number(id)} isNAT={!!instance.nat_info} />
            </div>
          )}
          {visitedTabs.has("snapshots") && (
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
        </div>
      </div>
      {ConfirmDialog}
      {ConfirmChoiceDialog}
      <MigrateDialog
        open={migrateOpen}
        onOpenChange={setMigrateOpen}
        instanceId={instance.id!}
        instanceName={instance.name ?? ""}
        currentNodeId={instance.node_id!}
        onSuccess={refreshInstance}
      />
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
