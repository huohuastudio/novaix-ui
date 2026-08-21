import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  Server,
  MonitorCog,
  ShoppingCart,
  MessageSquareText,
  Clock,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react"
import type { DashboardStatsResponse, DashboardRecentResponse } from "@/api"
import {
  getAdminDashboardRecentOptions,
  getAdminDashboardStatsOptions,
} from "@/api/@tanstack/react-query.gen"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useSiteName, useAdminPath } from "@/hooks/use-site-settings"
import { formatAmount, orderStatusMap, orderTypeMap } from "@/lib/order-constants"
import { formatPercent } from "@/lib/chart-utils"
import { formatMemory, formatDisk } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SetupGuide } from "@/components/setup-guide"
import { RegionMap } from "@/components/node-map"

const STATUS_META: Record<string, { label: string; tw: string }> = {
  running: { label: "运行中", tw: "bg-emerald-500" },
  stopped: { label: "已停止", tw: "bg-muted-foreground/40" },
  error: { label: "异常", tw: "bg-destructive" },
  creating: { label: "创建中", tw: "bg-amber-500" },
}

const revenueChartConfig: ChartConfig = {
  amount: { label: "收入", color: "var(--color-foreground)" },
}

function fmtDate(d: string) {
  return d.slice(5)
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days <= 0) return "今天"
  if (days === 1) return "明天"
  return `${days} 天后`
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8 space-y-6">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-[120px] w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  useBreadcrumb([{ label: "仪表盘" }])
  const siteName = useSiteName()
  const adminPath = useAdminPath()
  const statsQuery = useQuery(getAdminDashboardStatsOptions())
  const recentQuery = useQuery(getAdminDashboardRecentOptions())
  const stats: DashboardStatsResponse | null =
    statsQuery.data?.code === 0 && statsQuery.data.data
      ? (statsQuery.data.data as DashboardStatsResponse)
      : null
  const recent: DashboardRecentResponse | null =
    recentQuery.data?.code === 0 && recentQuery.data.data
      ? (recentQuery.data.data as DashboardRecentResponse)
      : null
  const loading = statsQuery.isPending || recentQuery.isPending

  const instanceStatusData = useMemo(() => {
    if (!stats?.instances) return []
    return [
      { key: "running", value: stats.instances.running ?? 0 },
      { key: "stopped", value: stats.instances.stopped ?? 0 },
      { key: "error", value: stats.instances.error ?? 0 },
      { key: "creating", value: stats.instances.creating ?? 0 },
    ].filter(d => d.value > 0)
  }, [stats])

  const [revenueDays, setRevenueDays] = useState<"7" | "14" | "30">("30")
  const [nodeSortKey, setNodeSortKey] = useState<"cpu" | "mem" | "disk">("cpu")

  const instanceTotal = useMemo(
    () => instanceStatusData.reduce((s, d) => s + d.value, 0),
    [instanceStatusData],
  )

  const revenueAreaDataFull = useMemo(() => {
    if (!stats?.revenue_trend) return []
    return (stats.revenue_trend as Array<{ date?: string; amount?: number }>).map(d => ({
      date: fmtDate(d.date ?? ""),
      amount: (d.amount ?? 0) / 100,
    }))
  }, [stats])

  const revenueAreaData = useMemo(
    () => revenueAreaDataFull.slice(-Number(revenueDays)),
    [revenueAreaDataFull, revenueDays],
  )

  const sortedNodeRanking = useMemo(() => {
    if (!stats?.node_ranking?.length) return []
    return [...stats.node_ranking].sort((a, b) => {
      const av = nodeSortKey === "cpu" ? a.cpu_usage : nodeSortKey === "mem" ? a.mem_usage : a.disk_usage
      const bv = nodeSortKey === "cpu" ? b.cpu_usage : nodeSortKey === "mem" ? b.mem_usage : b.disk_usage
      return (bv ?? 0) - (av ?? 0)
    })
  }, [stats, nodeSortKey])

  const revenueGrowth = useMemo(() => {
    if (!stats?.orders) return null
    const last = stats.orders.revenue_last_month
    if (!last || last === 0) return null
    const current = stats.orders.revenue_month ?? 0
    return ((current - last) / last) * 100
  }, [stats])

  if (loading) return <DashboardSkeleton />
  if (!stats) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
        <p className="mt-2 text-muted-foreground">加载失败，请刷新页面重试</p>
      </div>
    )
  }

  const pendingItems = [
    { count: stats.orders?.pending ?? 0, href: `${adminPath}/orders?status=pending`, icon: ShoppingCart, label: "待支付订单" },
    { count: stats.tickets?.open ?? 0, href: `${adminPath}/tickets`, icon: MessageSquareText, label: "待处理工单" },
    { count: stats.instances?.error ?? 0, href: `${adminPath}/instances?status=error`, icon: MonitorCog, label: "异常实例" },
    { count: stats.nodes?.error ?? 0, href: `${adminPath}/nodes?status=3`, icon: Server, label: "异常节点" },
  ].filter(item => item.count > 0)

  const resources = [
    { label: "CPU", used: stats.resources?.cpu_used ?? 0, total: stats.resources?.cpu_total ?? 0, format: (v: number) => `${v} 核` },
    { label: "内存", used: stats.resources?.mem_used ?? 0, total: stats.resources?.mem_total ?? 0, format: formatMemory },
    { label: "磁盘", used: stats.resources?.disk_used ?? 0, total: stats.resources?.disk_total ?? 0, format: formatDisk },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8 space-y-6">
      {/* 标题 + 待处理 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            欢迎使用 {siteName} 管理后台
          </p>
        </div>
        {pendingItems.length > 0 && (
          <div className="flex flex-wrap gap-2" data-tour="pending-items">
            {pendingItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted/60"
              >
                <item.icon className="size-3 text-muted-foreground" />
                <span>{item.label}</span>
                <Badge
                  variant={item.label.includes("异常") ? "destructive" : "secondary"}
                  className="ml-0.5 text-[10px] px-1.5 py-0"
                >
                  {item.count}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div data-tour="setup-guide">
        <SetupGuide />
      </div>

      {/* ═══ 第一行：收入卡片（大）═══ */}
      <div className="grid gap-4 lg:grid-cols-2" data-tour="revenue-trend">
        {/* 本月收入 — 大卡片，内嵌趋势图 */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">本月收入</p>
            <CardMenu
              value={revenueDays}
              onValueChange={v => setRevenueDays(v as "7" | "14" | "30")}
              options={[
                { value: "7", label: "近 7 天" },
                { value: "14", label: "近 14 天" },
                { value: "30", label: "近 30 天" },
              ]}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {formatAmount(stats.orders?.revenue_month ?? 0)}
            </span>
            {revenueGrowth !== null && (
              <span className={`inline-flex items-center gap-0.5 text-sm ${
                revenueGrowth >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}>
                {revenueGrowth >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                <span className="font-medium">{Math.abs(revenueGrowth).toFixed(1)}%</span>
                <span className="text-muted-foreground text-xs ml-0.5">较上月</span>
              </span>
            )}
          </div>
          {/* 内嵌 sparkline */}
          <div className="mt-4">
            {revenueAreaData.length > 0 ? (
              <ChartContainer config={revenueChartConfig} className="h-[120px] w-full">
                <AreaChart data={revenueAreaData} accessibilityLayer>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    interval="preserveStartEnd"
                    minTickGap={60}
                    style={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tickFormatter={(v) => `¥${v}`}
                    width={48}
                    style={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`¥${Number(value).toFixed(2)}`, "收入"]}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-amount)"
                    strokeWidth={1.5}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[120px] items-center justify-center text-xs text-muted-foreground">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* 今日收入 — 大卡片 */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">今日收入</p>
          <div className="mt-1">
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {formatAmount(stats.orders?.revenue_today ?? 0)}
            </span>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>订单总数</span>
            <span className="font-medium text-foreground tabular-nums">{stats.orders?.total ?? 0}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>已支付</span>
            <span className="font-medium text-foreground tabular-nums">{stats.orders?.paid_total ?? 0}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>待支付</span>
            <span className="font-medium text-foreground tabular-nums">{stats.orders?.pending ?? 0}</span>
          </div>
          <div className="mt-4">
            <Link
              to={`${adminPath}/orders`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              查看全部订单 <ArrowRight className="inline size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ 第二行：指标卡片（小）═══ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="stat-cards">
        {/* 节点 */}
        <Link to={`${adminPath}/nodes`} className="group rounded-xl border bg-card p-5 transition-colors hover:bg-accent/50">
          <p className="text-xs text-muted-foreground">节点</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
            {stats.nodes?.total ?? 0}
          </p>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">在线</span>
              <span className="font-medium tabular-nums">{stats.nodes?.online ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">异常</span>
              <span className={`font-medium tabular-nums ${(stats.nodes?.error ?? 0) > 0 ? "text-destructive" : ""}`}>
                {stats.nodes?.error ?? 0}
              </span>
            </div>
          </div>
        </Link>

        {/* 实例 — 内嵌状态条 */}
        <Link to={`${adminPath}/instances`} className="group rounded-xl border bg-card p-5 transition-colors hover:bg-accent/50">
          <p className="text-xs text-muted-foreground">实例</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
            {stats.instances?.total ?? 0}
          </p>
          {instanceStatusData.length > 0 && (
            <div className="mt-4 space-y-2.5">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {instanceStatusData.map(d => (
                  <div
                    key={d.key}
                    className={`${STATUS_META[d.key].tw} first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${(d.value / instanceTotal) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {instanceStatusData.map(d => (
                  <div key={d.key} className="flex items-center gap-1 text-[11px]">
                    <span className={`size-1.5 rounded-full ${STATUS_META[d.key].tw}`} />
                    <span className="text-muted-foreground">{STATUS_META[d.key].label}</span>
                    <span className="font-medium tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Link>

        {/* 用户 */}
        <Link to={`${adminPath}/users`} className="group rounded-xl border bg-card p-5 transition-colors hover:bg-accent/50">
          <p className="text-xs text-muted-foreground">用户</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
            {stats.users?.total ?? 0}
          </p>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">活跃</span>
              <span className="font-medium tabular-nums">{stats.users?.active ?? 0}</span>
            </div>
          </div>
        </Link>

        {/* 资源分配 — 内嵌进度条 */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">资源分配</p>
          <div className="mt-4 space-y-3">
            {resources.map(r => {
              const pct = r.total > 0 ? Math.min((r.used / r.total) * 100, 100) : 0
              const barColor =
                pct > 80 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-foreground/60"
              return (
                <div key={r.label} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="tabular-nums font-medium">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {r.format(r.used)} / {r.format(r.total)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ 节点：地图 + 资源排行并排 ═══ */}
      {((stats.region_locations?.length ?? 0) > 0 || sortedNodeRanking.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* 左：地图 */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-xs text-muted-foreground">节点分布</p>
              <Link
                to={`${adminPath}/nodes`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                查看全部 <ArrowRight className="inline size-3" />
              </Link>
            </div>
            <div className="px-5 pb-4">
              <RegionMap regions={stats.region_locations ?? []} />
            </div>
          </div>

          {/* 右：资源排行 */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-xs text-muted-foreground">节点资源</p>
              {sortedNodeRanking.length > 0 && (
                <CardMenu
                  value={nodeSortKey}
                  onValueChange={v => setNodeSortKey(v as "cpu" | "mem" | "disk")}
                  options={[
                    { value: "cpu", label: "按 CPU 排序" },
                    { value: "mem", label: "按内存排序" },
                    { value: "disk", label: "按磁盘排序" },
                  ]}
                />
              )}
            </div>
            {sortedNodeRanking.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">节点</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>内存</TableHead>
                  <TableHead>磁盘</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedNodeRanking.map(node => (
                  <TableRow key={node.id}>
                    <TableCell>
                      <Link
                        to={`${adminPath}/nodes/${node.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {node.name}
                      </Link>
                    </TableCell>
                    <TableCell><MiniBar value={node.cpu_usage ?? 0} /></TableCell>
                    <TableCell><MiniBar value={node.mem_usage ?? 0} /></TableCell>
                    <TableCell><MiniBar value={node.disk_usage ?? 0} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            ) : (
              <p className="px-5 pb-5 text-sm text-muted-foreground">暂无在线节点</p>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* ═══ 最近动态：三列 ═══ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 最近订单 */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <p className="text-xs text-muted-foreground">最近订单</p>
            <Link to={`${adminPath}/orders`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              查看全部 <ArrowRight className="inline size-3" />
            </Link>
          </div>
          {recent?.orders && recent.orders.length > 0 ? (
            <div className="divide-y">
              {recent.orders.map(order => (
                <div key={order.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular-nums">
                      {formatAmount(order.amount ?? 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {order.username} · {orderTypeMap[order.type ?? ""] ?? order.type}
                    </p>
                  </div>
                  <Badge
                    variant={orderStatusMap[order.status ?? ""]?.variant ?? "secondary"}
                    className="shrink-0 ml-3 text-[10px] px-1.5 py-0"
                  >
                    {orderStatusMap[order.status ?? ""]?.label ?? order.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">暂无订单</p>
          )}
        </div>

        {/* 即将到期 */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">即将到期</p>
              <Clock className="size-3 text-muted-foreground" />
            </div>
            <Link to={`${adminPath}/instances`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              查看全部 <ArrowRight className="inline size-3" />
            </Link>
          </div>
          {recent?.expiring && recent.expiring.length > 0 ? (
            <div className="divide-y">
              {recent.expiring.map(inst => (
                <Link
                  key={inst.id}
                  to={`${adminPath}/instances/${inst.id}`}
                  className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inst.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {inst.username}
                      {(inst.ip_address || inst.ipv6_address) && ` · ${inst.ip_address || inst.ipv6_address}`}
                    </p>
                  </div>
                  <div className="shrink-0 ml-3 text-right">
                    <p className="text-xs font-medium tabular-nums">{daysUntil(inst.expire_at ?? "")}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {(inst.expire_at ?? "").slice(5, 10)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">暂无即将到期的实例</p>
          )}
        </div>

        {/* 最近操作 — 时间线 */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <p className="text-xs text-muted-foreground">最近操作</p>
            <Link to={`${adminPath}/logs`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              查看全部 <ArrowRight className="inline size-3" />
            </Link>
          </div>
          {recent?.events && recent.events.length > 0 ? (
            <div className="px-5 pb-4">
              <div className="space-y-0">
                {recent.events.map((event, idx, arr) => (
                  <div key={event.id} className="flex gap-3">
                    {/* 左侧：圆点 + 连线 */}
                    <div className="flex flex-col items-center">
                      <div className={`mt-1.5 size-2 shrink-0 rounded-full ${getActionColor(event.action ?? "")}`} />
                      {idx < arr.length - 1 && (
                        <div className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    {/* 右侧：内容 */}
                    <div className="pb-4 min-w-0">
                      <p className="text-sm leading-snug truncate">{event.detail}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {event.username} · {(event.created_at ?? "").slice(5, 16)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">暂无操作记录</p>
          )}
        </div>
      </div>
    </div>
  )
}

function CardMenu({ value, onValueChange, options }: {
  value: string
  onValueChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map(opt => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getActionColor(action: string) {
  if (action.includes("delete") || action.includes("force")) return "bg-destructive"
  if (action.includes("create") || action.includes("init") || action.includes("pay")) return "bg-emerald-500"
  if (action.includes("update") || action.includes("adjust")) return "bg-amber-500"
  return "bg-muted-foreground/60"
}

function MiniBar({ value }: { value: number }) {
  const pct = Math.min(value, 100)
  const color = pct > 80 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-foreground/60"
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
        {formatPercent(value)}
      </span>
    </div>
  )
}
