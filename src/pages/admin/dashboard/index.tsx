import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Server,
  MonitorCog,
  Users,
  Banknote,
  MessageSquareText,
  ShoppingCart,
  Clock,
  TrendingUp,
  Activity,
  Check,
} from "lucide-react"
import { getAdminDashboardStats, getAdminDashboardRecent } from "@/api"
import type { DashboardStatsResponse, DashboardRecentResponse } from "@/api"
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
import { StatCard } from "@/components/stat-card"
import { SetupGuide } from "@/components/setup-guide"

const INSTANCE_STATUS_COLORS: Record<string, string> = {
  running: "hsl(142, 71%, 45%)",
  stopped: "hsl(215, 14%, 60%)",
  error: "hsl(0, 84%, 60%)",
  creating: "hsl(47, 96%, 53%)",
}

const INSTANCE_STATUS_LABELS: Record<string, string> = {
  running: "运行中",
  stopped: "已停止",
  error: "异常",
  creating: "创建中",
}

const instanceChartConfig: ChartConfig = {
  running: { label: "运行中", color: INSTANCE_STATUS_COLORS.running },
  stopped: { label: "已停止", color: INSTANCE_STATUS_COLORS.stopped },
  error: { label: "异常", color: INSTANCE_STATUS_COLORS.error },
  creating: { label: "创建中", color: INSTANCE_STATUS_COLORS.creating },
}

const revenueChartConfig: ChartConfig = {
  amount: { label: "收入", color: "var(--chart-1)" },
}

const RING_RADIUS = 36
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

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

function ResourceRing({ label, used, total, formatFn, color }: {
  label: string
  used: number
  total: number
  formatFn: (v: number) => string
  color: string
}) {
  const pct = total > 0 ? (used / total) * 100 : 0
  const offset = RING_CIRCUMFERENCE - (Math.min(pct, 100) / 100) * RING_CIRCUMFERENCE
  const ringColor = pct > 80 ? "stroke-destructive" : pct > 60 ? "stroke-amber-500" : color

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-24">
        <svg className="size-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={RING_RADIUS} fill="none" className="stroke-muted" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={RING_RADIUS} fill="none"
            className={`${ringColor} transition-all duration-700`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{formatFn(used)} / {formatFn(total)}</p>
      </div>
    </div>
  )
}

function NodeBar({ name, cpu, mem, disk, nodeId }: {
  name: string
  cpu: number
  mem: number
  disk: number
  nodeId?: number
}) {
  const adminPath = useAdminPath()
  const barColor = (v: number) =>
    v > 80 ? "bg-destructive" : v > 60 ? "bg-amber-500" : "bg-blue-500"

  const items = [
    { label: "CPU", value: cpu },
    { label: "内存", value: mem },
    { label: "磁盘", value: disk },
  ]

  return (
    <div className="rounded-md border px-4 py-3">
      <div className="mb-2.5">
        {nodeId ? (
          <Link to={`${adminPath}/nodes/${nodeId}`} className="text-sm font-medium hover:underline">
            {name}
          </Link>
        ) : (
          <span className="text-sm font-medium">{name}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.label}</span>
              <span className="tabular-nums font-medium">{formatPercent(item.value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(item.value)} transition-all duration-500`}
                style={{ width: `${Math.min(item.value, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-8">
      <div>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-md border p-5 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-[280px] w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-[260px] w-full rounded-md" />
        </div>
        <div className="lg:col-span-5 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-[260px] w-full rounded-md" />
        </div>
        <div className="lg:col-span-4 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-[260px] w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  useBreadcrumb([{ label: "仪表盘" }])
  const siteName = useSiteName()
  const adminPath = useAdminPath()
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [recent, setRecent] = useState<DashboardRecentResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [s, r] = await Promise.all([getAdminDashboardStats(), getAdminDashboardRecent()])
        if (cancelled) return
        if (s.data?.code === 0 && s.data.data) setStats(s.data.data as DashboardStatsResponse)
        if (r.data?.code === 0 && r.data.data) setRecent(r.data.data as DashboardRecentResponse)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const instancePieData = useMemo(() => {
    if (!stats?.instances) return []
    return [
      { key: "running", value: stats.instances.running ?? 0, fill: INSTANCE_STATUS_COLORS.running },
      { key: "stopped", value: stats.instances.stopped ?? 0, fill: INSTANCE_STATUS_COLORS.stopped },
      { key: "error", value: stats.instances.error ?? 0, fill: INSTANCE_STATUS_COLORS.error },
      { key: "creating", value: stats.instances.creating ?? 0, fill: INSTANCE_STATUS_COLORS.creating },
    ].filter(d => d.value > 0)
  }, [stats])

  const revenueAreaData = useMemo(() => {
    if (!stats?.revenue_trend) return []
    return (stats.revenue_trend as Array<{ date?: string; amount?: number }>).map(d => ({
      date: fmtDate(d.date ?? ""),
      amount: (d.amount ?? 0) / 100,
    }))
  }, [stats])

  const sortedNodeRanking = useMemo(() => {
    if (!stats?.node_ranking?.length) return []
    return [...stats.node_ranking].sort((a, b) => (b.cpu_usage ?? 0) - (a.cpu_usage ?? 0))
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

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-8 pb-8">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">欢迎使用 {siteName} 管理后台</p>
      </div>

      {/* 新手引导 */}
      <SetupGuide />

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Server}
          label="节点"
          value={stats.nodes?.total ?? 0}
          sub={`在线 ${stats.nodes?.online ?? 0} · 异常 ${stats.nodes?.error ?? 0}`}
          href={`${adminPath}/nodes`}
          styleIndex={0}
        />
        <StatCard
          icon={MonitorCog}
          label="实例"
          value={stats.instances?.total ?? 0}
          sub={`运行 ${stats.instances?.running ?? 0} · 停止 ${stats.instances?.stopped ?? 0}`}
          href={`${adminPath}/instances`}
          styleIndex={1}
        />
        <StatCard
          icon={Users}
          label="用户"
          value={stats.users?.total ?? 0}
          sub={`活跃 ${stats.users?.active ?? 0}`}
          href={`${adminPath}/users`}
          styleIndex={2}
        />
        <StatCard
          icon={Banknote}
          label="本月收入"
          value={formatAmount(stats.orders?.revenue_month ?? 0)}
          sub={`今日 ${formatAmount(stats.orders?.revenue_today ?? 0)}`}
          href={`${adminPath}/orders`}
          styleIndex={3}
        />
      </div>

      {/* 收入趋势 - 独占一行 */}
      <div className="rounded-md border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-medium">收入趋势</h3>
              <p className="text-xs text-muted-foreground mt-0.5">近 30 天每日收入</p>
            </div>
          </div>
          <Link to={`${adminPath}/orders`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            查看订单 →
          </Link>
        </div>
        {revenueAreaData.length > 0 ? (
          <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
            <AreaChart data={revenueAreaData} accessibilityLayer>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => `¥${v}`}
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
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">暂无收入数据</div>
        )}
      </div>

      {/* 实例分布 + 资源使用 + 待处理 */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* 实例状态分布 */}
        <div className="lg:col-span-3 rounded-md border p-5">
          <h3 className="text-sm font-medium">实例状态</h3>
          <p className="text-xs text-muted-foreground mt-0.5">当前状态分布</p>
          {instancePieData.length > 0 ? (
            <>
              <ChartContainer config={instanceChartConfig} className="mx-auto h-[180px] mt-2">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                  <Pie
                    data={instancePieData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={50}
                    outerRadius={72}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {instancePieData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 8} className="fill-foreground text-2xl font-bold">
                                {stats.instances?.total ?? 0}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 14} className="fill-muted-foreground text-xs">
                                总实例
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {instancePieData.map((d) => (
                  <div key={d.key} className="flex items-center gap-1.5 text-xs">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="text-muted-foreground">{INSTANCE_STATUS_LABELS[d.key]}</span>
                    <span className="font-medium tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">暂无实例</div>
          )}
        </div>

        {/* 资源使用 */}
        <div className="lg:col-span-5 rounded-md border p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">资源使用</h3>
              <p className="text-xs text-muted-foreground mt-0.5">所有在线节点汇总</p>
            </div>
            <Activity className="size-4 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-around mt-6">
            <ResourceRing
              label="CPU"
              used={stats.resources?.cpu_used ?? 0}
              total={stats.resources?.cpu_total ?? 0}
              formatFn={(v) => `${v} 核`}
              color="stroke-blue-500"
            />
            <ResourceRing
              label="内存"
              used={stats.resources?.mem_used ?? 0}
              total={stats.resources?.mem_total ?? 0}
              formatFn={formatMemory}
              color="stroke-emerald-500"
            />
            <ResourceRing
              label="磁盘"
              used={stats.resources?.disk_used ?? 0}
              total={stats.resources?.disk_total ?? 0}
              formatFn={formatDisk}
              color="stroke-violet-500"
            />
          </div>
        </div>

        {/* 待处理事项 */}
        <div className="lg:col-span-4 rounded-md border p-5">
          <h3 className="text-sm font-medium mb-4">待处理事项</h3>
          <div className="space-y-2">
            {(() => {
              const items = [
                { count: stats.orders?.pending ?? 0, href: `${adminPath}/orders?status=pending`, icon: ShoppingCart, label: "待支付订单", badgeVariant: "secondary" as const, bg: "bg-amber-50 dark:bg-amber-950/40", iconClass: "text-amber-600 dark:text-amber-400" },
                { count: stats.tickets?.open ?? 0, href: `${adminPath}/tickets`, icon: MessageSquareText, label: "待处理工单", badgeVariant: "secondary" as const, bg: "bg-blue-50 dark:bg-blue-950/40", iconClass: "text-blue-600 dark:text-blue-400" },
                { count: stats.instances?.error ?? 0, href: `${adminPath}/instances?status=error`, icon: MonitorCog, label: "异常实例", badgeVariant: "destructive" as const, bg: "bg-red-50 dark:bg-red-950/40", iconClass: "text-destructive" },
                { count: stats.nodes?.error ?? 0, href: `${adminPath}/nodes?status=3`, icon: Server, label: "异常节点", badgeVariant: "destructive" as const, bg: "bg-red-50 dark:bg-red-950/40", iconClass: "text-destructive" },
              ]
              const visible = items.filter(item => item.count > 0)
              if (visible.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-2">
                      <Check className="size-5 text-emerald-500" />
                    </div>
                    <p className="text-sm">一切正常</p>
                  </div>
                )
              }
              return visible.map(item => (
                <Link key={item.href} to={item.href} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className={`flex size-7 items-center justify-center rounded-md ${item.bg}`}>
                      <item.icon className={`size-3.5 ${item.iconClass}`} />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <Badge variant={item.badgeVariant}>{item.count}</Badge>
                </Link>
              ))
            })()}
          </div>
        </div>
      </div>

      {/* 节点资源排行 */}
      {sortedNodeRanking.length > 0 && (
        <div className="rounded-md border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium">节点资源排行</h3>
              <p className="text-xs text-muted-foreground mt-0.5">在线节点按 CPU 使用率排序</p>
            </div>
            <Link to={`${adminPath}/nodes`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">查看全部 →</Link>
          </div>
          <div className="space-y-4">
            {sortedNodeRanking.map((node) => (
              <NodeBar
                key={node.id}
                name={node.name ?? ""}
                cpu={node.cpu_usage ?? 0}
                mem={node.mem_usage ?? 0}
                disk={node.disk_usage ?? 0}
                nodeId={node.id}
              />
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* 最近订单 + 即将到期 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 最近订单 */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">最近订单</h3>
            <Link to={`${adminPath}/orders`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">查看全部 →</Link>
          </div>
          <div className="mt-3 rounded-md border overflow-x-auto">
            {recent?.orders && recent.orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.order_no}</TableCell>
                      <TableCell className="text-sm">{order.username}</TableCell>
                      <TableCell className="text-sm">{orderTypeMap[order.type ?? ""] ?? order.type}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">{formatAmount(order.amount ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant={orderStatusMap[order.status ?? ""]?.variant ?? "secondary"}>
                          {orderStatusMap[order.status ?? ""]?.label ?? order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无订单</p>
            )}
          </div>
        </div>

        {/* 即将到期实例 */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">即将到期</h3>
              <Clock className="size-3.5 text-muted-foreground" />
            </div>
            <Link to={`${adminPath}/instances`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">查看全部 →</Link>
          </div>
          <div className="mt-3 rounded-md border overflow-x-auto">
            {recent?.expiring && recent.expiring.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>实例</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>到期时间</TableHead>
                    <TableHead>自动续费</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.expiring.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell>
                        <Link to={`${adminPath}/instances/${inst.id}`} className="text-sm font-medium hover:underline">
                          {inst.name}
                        </Link>
                        {inst.ip_address && (
                          <span className="ml-1.5 text-xs text-muted-foreground">{inst.ip_address}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{inst.username}</TableCell>
                      <TableCell>
                        <span className="text-sm">{daysUntil(inst.expire_at ?? "")}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{(inst.expire_at ?? "").slice(0, 10)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={inst.auto_renew ? "default" : "outline"}>
                          {inst.auto_renew ? "已开启" : "未开启"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无即将到期的实例</p>
            )}
          </div>
        </div>
      </div>

      {/* 最近操作日志 */}
      {recent?.events && recent.events.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">最近操作</h3>
              <Link to={`${adminPath}/logs`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">查看全部 →</Link>
            </div>
            <div className="mt-3 space-y-1">
              {recent.events.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 transition-colors">
                  <span className="text-sm truncate">{event.detail}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">{event.username} · {event.created_at}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
