import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getAdminNodesByIdMetrics, putAdminNodesByIdMonitor } from "@/api"
import type { NodeMetricPoint } from "@/api"
import { formatBytes, getErrorMessage} from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChartCard, ChartLegend } from "@/components/chart-card"
import { Cpu, HardDrive, Network, Activity, MemoryStick, ChartLine, Power } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  CHART_RANGES,
  type TimeRange,
  type TooltipFormatter,
  formatTime,
  formatBytesPerSec,
  formatPercent,
  tooltipStyle,
  TICK_STYLE,
  AXIS_PROPS,
  CHART_MARGIN,
} from "@/lib/chart-utils"

const GAUGE_SIZE = 160

const LOAD_LABELS: Record<string, string> = { load1: "1 分钟", load5: "5 分钟", load15: "15 分钟" }

function GaugeChart({
  title,
  icon: Icon,
  percent,
  used,
  total,
  color,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  percent: number
  used: string
  total: string
  color: string
}) {
  const fillColor = percent > 80 ? "var(--color-destructive)" : percent > 60 ? "var(--color-chart-5)" : color
  const clampedPercent = Math.min(Math.max(percent, 0), 100)
  const pieData = [
    { name: "used", value: clampedPercent },
    { name: "free", value: 100 - clampedPercent },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">{title}</h4>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0 size-40">
          <PieChart width={GAUGE_SIZE} height={GAUGE_SIZE}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="85%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              cornerRadius={0}
              isAnimationActive
              animationDuration={800}
            >
              <Cell fill={fillColor} />
              <Cell fill="var(--color-muted)" />
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{formatPercent(percent)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 min-w-0 flex-1">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: fillColor }} />
                <span className="text-muted-foreground">已用</span>
              </div>
              <span className="font-medium tabular-nums">{used}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-muted shrink-0" />
                <span className="text-muted-foreground">总量</span>
              </div>
              <span className="font-medium tabular-nums">{total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatsContentSkeleton() {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="size-40 rounded-full shrink-0" />
              <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-2.5 rounded-full" />
                      <Skeleton className="h-3.5 w-8" />
                    </div>
                    <Skeleton className="h-3.5 w-14" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-2.5 rounded-full" />
                      <Skeleton className="h-3.5 w-8" />
                    </div>
                    <Skeleton className="h-3.5 w-14" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Separator className="my-6" />
      <div className="grid gap-8 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-56 w-full rounded-md" />
          </div>
        ))}
      </div>
    </>
  )
}

interface NodeStatsProps {
  nodeId: number
  monitorEnabled: boolean
  onMonitorChange: () => void
}

export default function NodeStats({ nodeId, monitorEnabled, onMonitorChange }: NodeStatsProps) {
  const [range, setRange] = useState<TimeRange>("1h")
  const [data, setData] = useState<NodeMetricPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const fetchMetrics = useCallback(async (silent = false) => {
    if (!monitorEnabled) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    try {
      const { data: res } = await getAdminNodesByIdMetrics({
        path: { id: nodeId },
        query: { range },
      })
      if (res?.code === 0 && res.data) {
        const points = res.data as NodeMetricPoint[]
        setData((prev) => {
          const lastNew = points[points.length - 1]?.timestamp
          const lastOld = prev[prev.length - 1]?.timestamp
          if (points.length === prev.length && lastNew === lastOld) return prev
          return points
        })
      }
    } catch {
      // ignore
    } finally {
      if (!silent) setLoading(false)
    }
  }, [nodeId, range, monitorEnabled])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据获取模式需在 effect 中触发加载状态
    fetchMetrics()
    if (!monitorEnabled) return
    const interval = setInterval(() => fetchMetrics(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchMetrics, monitorEnabled])

  const chartData = useMemo(() => {
    if (data.length === 0) return []
    return data.map((d) => ({
      ...d,
      time: formatTime(d.timestamp, range),
      mem_percent: d.mem_total ? ((d.mem_used ?? 0) / d.mem_total) * 100 : 0,
      disk_percent: d.disk_total ? ((d.disk_used ?? 0) / d.disk_total) * 100 : 0,
    }))
  }, [data, range])

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null

  const handleToggle = async () => {
    setToggling(true)
    try {
      const { data: res } = await putAdminNodesByIdMonitor({
        path: { id: nodeId },
        body: { enabled: !monitorEnabled },
      })
      if (res?.code === 0) {
        toast.success(monitorEnabled ? "监控已关闭" : "监控已启用，数据将在约 2 分钟后出现")
        onMonitorChange()
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setToggling(false)
    }
  }

  if (!monitorEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ChartLine className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium mb-1">监控未启用</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          启用后将自动安装 Node Exporter 并定期采集 CPU、内存、磁盘、网络等指标
        </p>
        <Button onClick={handleToggle} disabled={toggling}>
          {toggling ? <Spinner /> : <Power className="size-4" />}
          {toggling ? "正在启用..." : "启用监控"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-lg bg-muted p-1">
          {CHART_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === r.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Spinner className="text-muted-foreground" />}
          <Button variant="outline" size="sm" onClick={handleToggle} disabled={toggling}>
            {toggling ? <Spinner size="sm" /> : <Power className="size-3.5" />}
            关闭监控
          </Button>
        </div>
      </div>

      {loading ? (
        <StatsContentSkeleton />
      ) : chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">暂无监控数据，采集器每 60 秒采集一次，首条数据约 2 分钟后出现</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <GaugeChart
              title="CPU 使用率"
              icon={Cpu}
              percent={latest?.cpu_usage ?? 0}
              used={formatPercent(latest?.cpu_usage ?? 0)}
              total={latest?.cpu_cores ? `${latest.cpu_cores} 核` : "100%"}
              color="var(--color-chart-1)"
            />
            <GaugeChart
              title="内存使用率"
              icon={MemoryStick}
              percent={latest?.mem_percent ?? 0}
              used={formatBytes(latest?.mem_used ?? 0)}
              total={formatBytes(latest?.mem_total ?? 0)}
              color="var(--color-chart-2)"
            />
            <GaugeChart
              title="磁盘使用率"
              icon={HardDrive}
              percent={latest?.disk_percent ?? 0}
              used={formatBytes(latest?.disk_used ?? 0)}
              total={formatBytes(latest?.disk_total ?? 0)}
              color="var(--color-chart-3)"
            />
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard title="CPU 趋势" icon={Cpu}>
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={chartData} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={((v: number) => [formatPercent(v as number | undefined), "CPU"]) as TooltipFormatter} />
                  <Area type="monotone" dataKey="cpu_usage" stroke="var(--color-chart-1)" fill="url(#cpuGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              )}
            </ChartCard>

            <ChartCard title="内存趋势" icon={MemoryStick}>
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={chartData} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={((_v: number, _name: string, props: Record<string, unknown>) => {
                      const p = (props as unknown as { payload: (typeof chartData)[number] }).payload
                      return [`${formatPercent(p.mem_percent)} (${formatBytes(p.mem_used ?? 0)} / ${formatBytes(p.mem_total ?? 0)})`, "内存"]
                    }) as TooltipFormatter}
                  />
                  <Area type="monotone" dataKey="mem_percent" stroke="var(--color-chart-2)" fill="url(#memGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              )}
            </ChartCard>

            <ChartCard
              title="网络流量"
              icon={Network}
              legend={<ChartLegend items={[{ color: "var(--color-chart-4)", label: "接收" }, { color: "var(--color-chart-5)", label: "发送" }]} />}
            >
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={chartData} margin={CHART_MARGIN}>
                  <defs>
                    <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-4)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-chart-4)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-5)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickFormatter={(v) => formatBytes(v)} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={((v: number, name: string) => [
                      formatBytesPerSec(v as number),
                      name === "net_rx" ? "接收" : "发送",
                    ]) as TooltipFormatter}
                  />
                  <Area type="monotone" dataKey="net_rx" stroke="var(--color-chart-4)" fill="url(#rxGrad)" strokeWidth={1.5} dot={false} name="net_rx" />
                  <Area type="monotone" dataKey="net_tx" stroke="var(--color-chart-5)" fill="url(#txGrad)" strokeWidth={1.5} dot={false} name="net_tx" />
                </AreaChart>
              )}
            </ChartCard>

            <ChartCard
              title="系统负载"
              icon={Activity}
              legend={<ChartLegend items={[{ color: "var(--color-chart-1)", label: "1 分钟" }, { color: "var(--color-chart-2)", label: "5 分钟" }, { color: "var(--color-chart-3)", label: "15 分钟" }]} />}
            >
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={chartData} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                  <YAxis tick={TICK_STYLE} {...AXIS_PROPS} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={((v: number, name: string) => [v != null && !isNaN(v as number) ? (v as number).toFixed(2) : "-", LOAD_LABELS[name as string] ?? name]) as TooltipFormatter}
                  />
                  <Area type="monotone" dataKey="load1" stroke="var(--color-chart-1)" fill="none" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="load5" stroke="var(--color-chart-2)" fill="none" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="load15" stroke="var(--color-chart-3)" fill="none" strokeWidth={1.5} dot={false} />
                </AreaChart>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
