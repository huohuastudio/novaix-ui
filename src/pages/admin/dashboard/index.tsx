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
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronRight,
  CircleCheck,
} from "lucide-react"
import type { DashboardStatsResponse, DashboardRecentResponse } from "@/api"
import {
  getAdminDashboardRecentOptions,
  getAdminDashboardStatsOptions,
} from "@/api/@tanstack/react-query.gen"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useSiteName, useAdminPath, useFormatAmount, useCurrencySymbol, useFormatShortDate, useFormatCompactDateTime } from "@/hooks/use-site-settings"
import { orderStatusMap, orderTypeMap } from "@/lib/order-constants"
import { formatPercent } from "@/lib/chart-utils"
import { cn, formatMemory, formatDisk } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SetupGuide } from "@/components/setup-guide"
import { RegionMap } from "@/components/node-map"

const STATUS_META: Record<string, { label: string; tw: string }> = {
  running: { label: "运行中", tw: "bg-emerald-500" },
  stopped: { label: "已停止", tw: "bg-muted-foreground/40" },
  error: { label: "异常", tw: "bg-destructive" },
  creating: { label: "创建中", tw: "bg-amber-500" },
  other: { label: "其他", tw: "bg-sky-500" },
}

const revenueChartConfig: ChartConfig = {
  amount: { label: "收入", color: "var(--color-foreground)" },
}

// 排行列表最多展示的节点数，避免右侧面板过长
const NODE_RANK_LIMIT = 5

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

function usageColor(pct: number) {
  return pct > 80 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-foreground/60"
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8 space-y-6">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 rounded-lg border lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-5 space-y-4 lg:col-span-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-[240px] w-full" />
        </div>
        <div className="rounded-lg border p-5 space-y-3">
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[300px] w-full rounded-lg lg:col-span-2" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  useBreadcrumb([{ label: "仪表盘" }])
  const siteName = useSiteName()
  const adminPath = useAdminPath()
  const formatAmount = useFormatAmount()
  const currencySymbol = useCurrencySymbol()
  const formatShortDate = useFormatShortDate()
  const formatCompactDateTime = useFormatCompactDateTime()
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
    const items = [
      { key: "running", value: stats.instances.running ?? 0 },
      { key: "stopped", value: stats.instances.stopped ?? 0 },
      { key: "error", value: stats.instances.error ?? 0 },
      { key: "creating", value: stats.instances.creating ?? 0 },
    ]
    // 冻结、迁移中等其余状态归为"其他"，保证比例条与总数一致
    const known = items.reduce((s, d) => s + d.value, 0)
    items.push({ key: "other", value: Math.max((stats.instances.total ?? 0) - known, 0) })
    return items.filter(d => d.value > 0)
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

  // 所选区间内的收入合计（单位：元，与图表一致）
  const revenueRangeTotal = useMemo(
    () => revenueAreaData.reduce((s, d) => s + d.amount, 0),
    [revenueAreaData],
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
    { count: stats.orders?.pending ?? 0, href: `${adminPath}/orders?status=pending`, icon: ShoppingCart, label: "待支付订单", danger: false },
    { count: stats.tickets?.open ?? 0, href: `${adminPath}/tickets`, icon: MessageSquareText, label: "待处理工单", danger: false },
    { count: stats.instances?.error ?? 0, href: `${adminPath}/instances?status=error`, icon: MonitorCog, label: "异常实例", danger: true },
    { count: stats.nodes?.error ?? 0, href: `${adminPath}/nodes?status=3`, icon: Server, label: "异常节点", danger: true },
  ]
  const pendingTotal = pendingItems.reduce((s, i) => s + i.count, 0)

  const resources = [
    { label: "CPU", used: stats.resources?.cpu_used ?? 0, total: stats.resources?.cpu_total ?? 0, format: (v: number) => `${v} 核` },
    { label: "内存", used: stats.resources?.mem_used ?? 0, total: stats.resources?.mem_total ?? 0, format: formatMemory },
    { label: "磁盘", used: stats.resources?.disk_used ?? 0, total: stats.resources?.disk_total ?? 0, format: formatDisk },
  ]

  const nodeError = stats.nodes?.error ?? 0

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8 space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          欢迎使用 {siteName} 管理后台
        </p>
      </div>

      <div data-tour="setup-guide">
        <SetupGuide />
      </div>

      {/* ═══ KPI 条：一个容器内分格，避免卡片堆叠 ═══ */}
      <div
        className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-5 [&>*]:bg-background max-lg:[&>*:first-child]:col-span-2"
        data-tour="stat-cards"
      >
        <KpiCell label="本月收入" value={formatAmount(stats.orders?.revenue_month ?? 0)}>
          {revenueGrowth !== null ? (
            <span className={cn(
              "inline-flex items-center gap-0.5",
              revenueGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
            )}>
              {revenueGrowth >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              <span className="font-medium tabular-nums">{Math.abs(revenueGrowth).toFixed(1)}%</span>
              <span className="ml-0.5 text-muted-foreground">较上月</span>
            </span>
          ) : (
            <span>上月无收入数据</span>
          )}
        </KpiCell>
        <KpiCell label="今日收入" value={formatAmount(stats.orders?.revenue_today ?? 0)} href={`${adminPath}/orders`}>
          已支付 <span className="tabular-nums text-foreground">{stats.orders?.paid_total ?? 0}</span>
          {" / "}共 <span className="tabular-nums text-foreground">{stats.orders?.total ?? 0}</span> 单
        </KpiCell>
        <KpiCell label="实例" value={stats.instances?.total ?? 0} href={`${adminPath}/instances`}>
          运行中 <span className="tabular-nums text-foreground">{stats.instances?.running ?? 0}</span>
        </KpiCell>
        <KpiCell label="节点" value={stats.nodes?.total ?? 0} href={`${adminPath}/nodes`}>
          在线 <span className="tabular-nums text-foreground">{stats.nodes?.online ?? 0}</span>
          {nodeError > 0 && (
            <> · <span className="tabular-nums text-destructive">异常 {nodeError}</span></>
          )}
        </KpiCell>
        <KpiCell label="用户" value={stats.users?.total ?? 0} href={`${adminPath}/users`}>
          活跃 <span className="tabular-nums text-foreground">{stats.users?.active ?? 0}</span>
        </KpiCell>
      </div>

      {/* ═══ 收入趋势 + 待处理 / 实例状态 ═══ */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border p-5 lg:col-span-2" data-tour="revenue-trend">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">收入趋势</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                近 {revenueDays} 天合计{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatAmount(Math.round(revenueRangeTotal * 100))}
                </span>
              </p>
            </div>
            <Tabs value={revenueDays} onValueChange={v => setRevenueDays(v as "7" | "14" | "30")}>
              <TabsList className="h-8">
                <TabsTrigger value="7" className="px-2.5 text-xs">7 天</TabsTrigger>
                <TabsTrigger value="14" className="px-2.5 text-xs">14 天</TabsTrigger>
                <TabsTrigger value="30" className="px-2.5 text-xs">30 天</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="mt-4">
            {revenueAreaData.length > 0 ? (
              <ChartContainer config={revenueChartConfig} className="h-[240px] w-full">
                <AreaChart data={revenueAreaData} accessibilityLayer margin={{ left: 0, right: 4, top: 4 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} className="stroke-border/50" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    style={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    tickFormatter={(v) => `${currencySymbol}${v}`}
                    width={56}
                    style={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`${currencySymbol}${Number(value).toFixed(2)}`, "收入"]}
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
              <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
                暂无数据
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-lg border">
          <div className="p-5 pb-3" data-tour="pending-items">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">待处理事项</h3>
              {pendingTotal > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">共 {pendingTotal} 项</span>
              )}
            </div>
            <div className="mt-3 -mx-2">
              {pendingItems.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="group flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  <span className={cn(item.count === 0 && "text-muted-foreground")}>{item.label}</span>
                  <span
                    className={cn(
                      "ml-auto tabular-nums",
                      item.count === 0
                        ? "text-muted-foreground"
                        : item.danger
                          ? "font-medium text-destructive"
                          : "font-medium",
                    )}
                  >
                    {item.count}
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">实例状态</h3>
              <span className="text-xs text-muted-foreground tabular-nums">共 {stats.instances?.total ?? 0} 台</span>
            </div>
            {instanceStatusData.length > 0 ? (
              <>
                <div className="mt-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                  {instanceStatusData.map(d => (
                    <div
                      key={d.key}
                      className={STATUS_META[d.key].tw}
                      style={{ width: `${(d.value / instanceTotal) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {instanceStatusData.map(d => (
                    <div key={d.key} className="flex items-center gap-1.5 text-xs">
                      <span className={`size-2 rounded-full ${STATUS_META[d.key].tw}`} />
                      <span className="text-muted-foreground">{STATUS_META[d.key].label}</span>
                      <span className="ml-auto font-medium tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">暂无实例</p>
            )}
          </div>
        </section>
      </div>

      {/* ═══ 节点分布 + 资源使用 / 排行 ═══ */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h3 className="text-sm font-medium">节点分布</h3>
            <ViewAll to={`${adminPath}/nodes`} />
          </div>
          <div className="px-5 pb-4">
            {(stats.region_locations?.length ?? 0) > 0 ? (
              <RegionMap regions={stats.region_locations ?? []} />
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">暂未配置区域坐标</p>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-lg border">
          <div className="p-5">
            <h3 className="text-sm font-medium">资源使用</h3>
            <div className="mt-4 space-y-3.5">
              {resources.map(r => {
                const pct = r.total > 0 ? Math.min((r.used / r.total) * 100, 100) : 0
                return (
                  <div key={r.label}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {r.format(r.used)} / {r.format(r.total)}
                        <span className="ml-2 font-medium text-foreground">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${usageColor(pct)} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex-1 border-t p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">节点资源排行</h3>
              {sortedNodeRanking.length > 0 && (
                <Select value={nodeSortKey} onValueChange={v => setNodeSortKey(v as "cpu" | "mem" | "disk")}>
                  <SelectTrigger size="sm" className="h-7 w-auto gap-1 border-none px-2 text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="cpu">按 CPU</SelectItem>
                    <SelectItem value="mem">按内存</SelectItem>
                    <SelectItem value="disk">按磁盘</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {sortedNodeRanking.length > 0 ? (
              <div className="mt-3 space-y-2.5">
                {sortedNodeRanking.slice(0, NODE_RANK_LIMIT).map(node => {
                  const value = nodeSortKey === "cpu" ? node.cpu_usage : nodeSortKey === "mem" ? node.mem_usage : node.disk_usage
                  return (
                    <div key={node.id} className="flex items-center gap-3">
                      <Link
                        to={`${adminPath}/nodes/${node.id}`}
                        className="w-24 shrink-0 truncate text-sm hover:underline"
                      >
                        {node.name}
                      </Link>
                      <MiniBar value={value ?? 0} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">暂无在线节点</p>
            )}
          </div>
        </section>
      </div>

      {/* ═══ 最近订单 + 即将到期 / 最近操作 ═══ */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-lg border lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-medium">最近订单</h3>
            <ViewAll to={`${adminPath}/orders`} />
          </div>
          {recent?.orders && recent.orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">用户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead className="pl-6">状态</TableHead>
                  <TableHead className="pr-5 text-right">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="pl-5 font-medium">{order.username}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {orderTypeMap[order.type ?? ""] ?? order.type}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(order.amount ?? 0)}</TableCell>
                    <TableCell className="pl-6">
                      <Badge
                        variant={orderStatusMap[order.status ?? ""]?.variant ?? "secondary"}
                        className="text-2xs px-1.5 py-0"
                      >
                        {orderStatusMap[order.status ?? ""]?.label ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right text-xs text-muted-foreground tabular-nums">
                      {formatCompactDateTime(order.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-5 pb-5 text-sm text-muted-foreground">暂无订单</p>
          )}
        </section>

        <div className="space-y-4">
          <section className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="text-sm font-medium">即将到期</h3>
              <ViewAll to={`${adminPath}/instances`} />
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
                      <p className="truncate text-sm font-medium">{inst.name}</p>
                      <p className="truncate text-2xs text-muted-foreground">
                        {inst.username}
                        {(inst.ip_address || inst.ipv6_address) && ` · ${inst.ip_address || inst.ipv6_address}`}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-xs font-medium tabular-nums">{daysUntil(inst.expire_at ?? "")}</p>
                      <p className="text-2xs text-muted-foreground tabular-nums">
                        {formatShortDate(inst.expire_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 px-5 pb-5 text-xs text-muted-foreground">
                <CircleCheck className="size-3.5" />
                近期没有即将到期的实例
              </p>
            )}
          </section>

          <section className="rounded-lg border">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-sm font-medium">最近操作</h3>
              <ViewAll to={`${adminPath}/logs`} />
            </div>
            {recent?.events && recent.events.length > 0 ? (
              <div className="px-5 pb-3">
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
                    <div className="min-w-0 pb-3">
                      <p className="truncate text-sm leading-snug">{event.detail}</p>
                      <p className="text-2xs text-muted-foreground">
                        {event.username} · {formatCompactDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 pb-5 text-xs text-muted-foreground">暂无操作记录</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function KpiCell({ label, value, href, children }: {
  label: string
  value: React.ReactNode
  href?: string
  children?: React.ReactNode
}) {
  const content = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <div className="mt-1 truncate text-xs text-muted-foreground">{children}</div>
    </>
  )
  if (!href) return <div className="p-5">{content}</div>
  return (
    <Link to={href} className="p-5 transition-colors hover:bg-muted/40">
      {content}
    </Link>
  )
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
      查看全部 <ArrowRight className="inline size-3" />
    </Link>
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
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${usageColor(pct)} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {formatPercent(value)}
      </span>
    </div>
  )
}
