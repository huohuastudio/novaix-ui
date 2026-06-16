import { formatBytes } from "@/lib/utils"

export const CHART_RANGES = [
  { label: "1 小时", value: "1h" },
  { label: "6 小时", value: "6h" },
  { label: "24 小时", value: "24h" },
  { label: "7 天", value: "7d" },
  { label: "30 天", value: "30d" },
] as const

export type TimeRange = (typeof CHART_RANGES)[number]["value"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TooltipFormatter = any

export function formatTime(ts: string | undefined, range: TimeRange) {
  if (!ts) return "-"
  const d = new Date(ts)
  if (isNaN(d.getTime())) return "-"
  if (range === "7d" || range === "30d") {
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:00`
  }
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

export function formatBytesPerSec(bytes: number): string {
  return `${formatBytes(bytes)}/s`
}

export function formatPercent(value: number | undefined): string {
  if (value == null || isNaN(value)) return "-"
  return `${value.toFixed(1)}%`
}

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "12px",
  },
}

export const TICK_STYLE = { fontSize: 11, fill: "var(--color-muted-foreground)" }
export const AXIS_PROPS = { axisLine: false, tickLine: false } as const
export const CHART_MARGIN = { top: 4, right: 4, bottom: 0, left: -12 }
