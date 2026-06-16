import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"

// 统计卡片配色，按 styleIndex 取用
const STAT_STYLES = [
  { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400" },
  { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400" },
]

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  href?: string
  /** 按 STAT_STYLES 取配色；提供 iconBg/iconColor 时被覆盖 */
  styleIndex?: number
  /** 显式覆盖图标底色（用于语义化配色，如失败用红色） */
  iconBg?: string
  /** 显式覆盖图标颜色 */
  iconColor?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  styleIndex = 0,
  iconBg,
  iconColor,
}: StatCardProps) {
  const style = STAT_STYLES[styleIndex % STAT_STYLES.length]
  const bg = iconBg ?? style.bg
  const text = iconColor ?? style.text
  const inner = (
    <div className="group relative rounded-md border p-5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`size-5 ${text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
      {href && (
        <ArrowUpRight className="absolute right-3 top-3 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  )
  if (href) return <Link to={href} className="block">{inner}</Link>
  return inner
}
