import { useState, useMemo } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getPortalInstancesByIdMetricsOptions } from "@/api/@tanstack/react-query.gen"
import { formatBytes } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartCard, ChartLegend } from "@/components/chart-card"
import { Cpu, MemoryStick, HardDrive, Network } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  CHART_RANGES,
  type TimeRange,
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

  // instanceId/range 均通过 options 参数进入 queryKey，切换时自动重新请求
  const query = useQuery({
    ...getPortalInstancesByIdMetricsOptions({
      path: { id: instanceId },
      query: { range },
    }),
    // 每 60 秒后台轮询一次（对应原 setInterval 静默刷新）
    refetchInterval: 60_000,
    // 切换时间范围时保留旧图表数据，避免闪骨架屏（对应原实现的行为）
    placeholderData: keepPreviousData,
  })

  const data = useMemo(() => query.data?.data ?? [], [query.data])
  // 初始加载或切换范围时显示顶部 spinner；后台轮询保持静默
  const loading = query.isPending || query.isPlaceholderData

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
                <Tooltip {...tooltipStyle} formatter={(v) => [formatPercent(v as number | undefined), "CPU"]} />
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
                  formatter={(_v, _name, item) => {
                    const p = item.payload as (typeof chartData)[number]
                    return [`${formatPercent(p.mem_percent)} (${formatBytes(p.mem_used ?? 0)} / ${formatBytes(p.mem_total ?? 0)})`, "内存"]
                  }}
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
                  formatter={(_v, _name, item) => {
                    const p = item.payload as (typeof chartData)[number]
                    return [`${formatPercent(p.disk_percent)} (${formatBytes(p.disk_used ?? 0)} / ${formatBytes(p.disk_total ?? 0)})`, "磁盘"]
                  }}
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
                  formatter={(v, name) => [
                    formatBytesPerSec(v as number),
                    name === "net_rx" ? "接收" : "发送",
                  ]}
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
