import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getPortalInstancesByIdMetrics } from "@/api"
import type { PortalInstanceMetricPoint } from "@/api"
import { formatBytes } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartCard, ChartLegend } from "@/components/chart-card"
import { Cpu, MemoryStick, HardDrive, Network } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
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

interface InstanceStatsChartProps {
  instanceId: number
}

export function InstanceStatsChart({ instanceId }: InstanceStatsChartProps) {
  const [range, setRange] = useState<TimeRange>("1h")
  const [data, setData] = useState<PortalInstanceMetricPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data: res } = await getPortalInstancesByIdMetrics({
        path: { id: instanceId },
        query: { range },
      })
      if (res?.code === 0 && res.data) {
        const points = res.data as PortalInstanceMetricPoint[]
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
  }, [instanceId, range])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据获取模式需在 effect 中触发加载状态
    fetchMetrics()
    const interval = setInterval(() => fetchMetrics(true), 60_000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  const chartData = useMemo(() => {
    if (data.length === 0) return []
    return data.map((d) => ({
      ...d,
      time: formatTime(d.timestamp, range),
      mem_percent: d.mem_total ? ((d.mem_used ?? 0) / d.mem_total) * 100 : 0,
      disk_percent: d.disk_total ? ((d.disk_used ?? 0) / d.disk_total) * 100 : 0,
    }))
  }, [data, range])

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
        {loading && <Spinner className="text-muted-foreground" />}
      </div>

      {loading && data.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="CPU 趋势" icon={Cpu}>
            {({ width, height }) => (
              <AreaChart width={width} height={height} data={chartData} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="instCpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                <YAxis domain={[0, 100]} tick={TICK_STYLE} tickFormatter={(v) => `${v}%`} {...AXIS_PROPS} />
                <Tooltip {...tooltipStyle} formatter={((v: number) => [formatPercent(v as number | undefined), "CPU"]) as TooltipFormatter} />
                <Area type="monotone" dataKey="cpu_usage" stroke="var(--color-chart-1)" fill="url(#instCpuGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            )}
          </ChartCard>

          <ChartCard title="内存趋势" icon={MemoryStick}>
            {({ width, height }) => (
              <AreaChart width={width} height={height} data={chartData} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="instMemGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                <YAxis domain={[0, 100]} tick={TICK_STYLE} tickFormatter={(v) => `${v}%`} {...AXIS_PROPS} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={((_v: number, _name: string, props: Record<string, unknown>) => {
                    const p = (props as unknown as { payload: (typeof chartData)[number] }).payload
                    return [`${formatPercent(p.mem_percent)} (${formatBytes(p.mem_used ?? 0)} / ${formatBytes(p.mem_total ?? 0)})`, "内存"]
                  }) as TooltipFormatter}
                />
                <Area type="monotone" dataKey="mem_percent" stroke="var(--color-chart-2)" fill="url(#instMemGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            )}
          </ChartCard>

          <ChartCard title="磁盘趋势" icon={HardDrive}>
            {({ width, height }) => (
              <AreaChart width={width} height={height} data={chartData} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="instDiskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-3)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                <YAxis domain={[0, 100]} tick={TICK_STYLE} tickFormatter={(v) => `${v}%`} {...AXIS_PROPS} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={((_v: number, _name: string, props: Record<string, unknown>) => {
                    const p = (props as unknown as { payload: (typeof chartData)[number] }).payload
                    return [`${formatPercent(p.disk_percent)} (${formatBytes(p.disk_used ?? 0)} / ${formatBytes(p.disk_total ?? 0)})`, "磁盘"]
                  }) as TooltipFormatter}
                />
                <Area type="monotone" dataKey="disk_percent" stroke="var(--color-chart-3)" fill="url(#instDiskGrad)" strokeWidth={1.5} dot={false} />
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
                  <linearGradient id="instRxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-4)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-chart-4)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="instTxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-5)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="time" tick={TICK_STYLE} {...AXIS_PROPS} />
                <YAxis tick={TICK_STYLE} tickFormatter={(v) => formatBytes(v)} {...AXIS_PROPS} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={((v: number, name: string) => [
                    formatBytesPerSec(v as number),
                    name === "net_rx" ? "接收" : "发送",
                  ]) as TooltipFormatter}
                />
                <Area type="monotone" dataKey="net_rx" stroke="var(--color-chart-4)" fill="url(#instRxGrad)" strokeWidth={1.5} dot={false} name="net_rx" />
                <Area type="monotone" dataKey="net_tx" stroke="var(--color-chart-5)" fill="url(#instTxGrad)" strokeWidth={1.5} dot={false} name="net_tx" />
              </AreaChart>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  )
}
