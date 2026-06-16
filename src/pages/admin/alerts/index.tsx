import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { getAdminAlertLogs } from "@/api"
import type { AlertAlertLogItem } from "@/api"
import { getErrorMessage } from "@/lib/utils"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Bell } from "lucide-react"
import { useFormatDate } from "@/hooks/use-site-settings"

const alertTypeLabels: Record<string, string> = {
  node_cpu: "CPU 使用率",
  node_memory: "内存使用率",
  node_disk: "磁盘使用率",
  node_offline: "节点离线",
}

function formatValue(type: string, value: number): string {
  if (type === "node_offline") return "-"
  return `${value.toFixed(1)}%`
}

export default function Alerts() {
  useBreadcrumb([{ label: "告警记录" }])
  const formatDate = useFormatDate()

  const [items, setItems] = useState<AlertAlertLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState("")
  const pageSize = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await getAdminAlertLogs({
        query: {
          page,
          page_size: pageSize,
          ...(typeFilter ? { type: typeFilter as "node_cpu" | "node_memory" | "node_disk" | "node_offline" } : {}),
        },
      })
      if (res?.code === 0 && res.data) {
        setItems((res.data.items ?? []) as AlertAlertLogItem[])
        setTotal(res.data.total ?? 0)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "获取告警记录失败"))
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    fetchData()
  }, [fetchData])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">告警记录</h1>
          <p className="mt-1 text-sm text-muted-foreground">节点资源超阈值或离线时产生的告警记录</p>
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="node_cpu">CPU 使用率</SelectItem>
            <SelectItem value="node_memory">内存使用率</SelectItem>
            <SelectItem value="node_disk">磁盘使用率</SelectItem>
            <SelectItem value="node_offline">节点离线</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">时间</TableHead>
              <TableHead className="w-[120px]">类型</TableHead>
              <TableHead>目标</TableHead>
              <TableHead className="w-[100px]">当前值</TableHead>
              <TableHead className="w-[100px]">阈值</TableHead>
              <TableHead className="w-[80px]">通知</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Bell className="size-8 opacity-20" />
                    <span className="text-sm">暂无告警记录</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {alertTypeLabels[item.type ?? ""] ?? item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{item.target_name}</TableCell>
                  <TableCell className="text-sm tabular-nums">{formatValue(item.type ?? "", item.value ?? 0)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{formatValue(item.type ?? "", item.threshold ?? 0)}</TableCell>
                  <TableCell>
                    {item.notified ? (
                      <Badge variant="default" className="text-[10px]">已通知</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">未通知</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">共 {total} 条</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm tabular-nums">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
