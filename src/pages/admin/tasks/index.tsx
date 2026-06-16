import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  ClockIcon,
  LoaderIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Trash2,
} from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getAdminTasks, getAdminTasksStats, deleteAdminTasksFinished } from "@/api"
import type { TaskTaskItem, TaskStatsResponse } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate } from "@/hooks/use-site-settings"
import { getErrorMessage } from "@/lib/utils"
import {
  taskTypeLabel,
  taskTypeOptions,
  taskStatusMap,
  taskStatusOptions,
} from "@/lib/task-constants"
import { MultiSelect } from "@/components/multi-select"
import { InstancePopover } from "@/components/instance-popover"
import { NodePopover } from "@/components/node-popover"
import { UserPopover } from "@/components/user-popover"
import { LogViewer } from "@/components/log-viewer"
import { StatCard } from "@/components/stat-card"

const STAT_CARDS: {
  key: keyof TaskStatsResponse
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}[] = [
  { key: "pending", label: "待处理", icon: ClockIcon, iconBg: "bg-amber-50 dark:bg-amber-950/40", iconColor: "text-amber-600 dark:text-amber-400" },
  { key: "running", label: "进行中", icon: LoaderIcon, iconBg: "bg-blue-50 dark:bg-blue-950/40", iconColor: "text-blue-600 dark:text-blue-400" },
  { key: "completed_today", label: "今日完成", icon: CheckCircle2Icon, iconBg: "bg-emerald-50 dark:bg-emerald-950/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { key: "failed_today", label: "今日失败", icon: XCircleIcon, iconBg: "bg-red-50 dark:bg-red-950/40", iconColor: "text-red-600 dark:text-red-400" },
]

function StatCards({ stats }: { stats?: TaskStatsResponse }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((c) => (
          <div key={c.key} className="rounded-md border p-5">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="mt-3 h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-12" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STAT_CARDS.map(({ key, label, icon, iconBg, iconColor }) => (
        <StatCard
          key={key}
          icon={icon}
          label={label}
          value={stats[key] ?? 0}
          iconBg={iconBg}
          iconColor={iconColor}
        />
      ))}
    </div>
  )
}

const AUTO_REFRESH_INTERVAL = 5000

export default function Tasks() {
  useBreadcrumb([{ label: "任务管理" }])
  const formatDate = useFormatDate()

  const [stats, setStats] = useState<TaskStatsResponse>()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [clearing, setClearing] = useState(false)

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    // 非数字输入归一化为 undefined，避免 NaN 传给 *uint 触发 400
    const toID = (v: unknown) => {
      const n = Number(v)
      return v && Number.isInteger(n) && n > 0 ? n : undefined
    }
    // 状态以逗号分隔的字符串存储（兼容 URL 同步），拆分为数组传给后端
    const statusStr = filters.status ? String(filters.status) : ""
    const status = statusStr
      ? (statusStr.split(",") as ("pending" | "running" | "completed" | "failed")[])
      : undefined
    const { data: res } = await getAdminTasks({
      query: {
        page,
        page_size: pageSize,
        status,
        type: (filters.type as string) || undefined,
        node_id: toID(filters.node_id),
        instance_id: toID(filters.instance_id),
      },
    })
    return {
      items: res?.data?.items ?? [],
      total: res?.data?.total ?? 0,
      page: res?.data?.page ?? 1,
      page_size: res?.data?.page_size ?? pageSize,
    }
  }, [])

  const table = useDataTable({
    fetchFn: fetchData,
    filterKeys: ["status", "type", "node_id", "instance_id"],
  })

  const fetchStats = useCallback(async () => {
    try {
      const { data: res } = await getAdminTasksStats()
      if (res?.data) setStats(res.data)
    } catch {
      // 统计失败不打断主流程
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载任务统计
    void fetchStats()
  }, [fetchStats])

  // 自动刷新：静默刷新列表与统计，避免卸载已展开的实时日志面板
  const { refresh, refreshSilent } = table
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      refreshSilent()
      void fetchStats()
    }, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [autoRefresh, refreshSilent, fetchStats])

  const handleClear = useCallback(async () => {
    setClearing(true)
    try {
      const { data: res } = await deleteAdminTasksFinished()
      if (res?.code === 0) {
        toast.success("已清理 30 天前的已完成任务日志")
        refresh()
        void fetchStats()
      } else {
        toast.error(res?.message ?? "清理失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "清理失败"))
    } finally {
      setClearing(false)
    }
  }, [refresh, fetchStats])

  const columns: ColumnDef<TaskTaskItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: false,
      size: 60,
      cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span>,
    },
    {
      accessorKey: "type",
      header: "类型",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "任务类型",
        filterOptions: taskTypeOptions,
      },
      cell: ({ row }) => taskTypeLabel(row.original.type ?? ""),
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: false,
      cell: ({ row }) => {
        const s = taskStatusMap[row.original.status ?? ""]
        return s ? (
          <Badge variant={s.variant}>{s.label}</Badge>
        ) : (
          <Badge variant="outline">{row.original.status}</Badge>
        )
      },
    },
    {
      id: "node_id",
      header: "节点",
      enableSorting: false,
      meta: {
        filterVariant: "text" as const,
        filterPlaceholder: "节点 ID",
      },
      cell: ({ row }) => <NodePopover nodeId={row.original.node_id} label={row.original.node_name} />,
    },
    {
      id: "instance_id",
      header: "实例",
      enableSorting: false,
      meta: {
        filterVariant: "text" as const,
        filterPlaceholder: "实例 ID",
      },
      cell: ({ row }) =>
        row.original.instance_id ? (
          <InstancePopover instanceId={row.original.instance_id} label={row.original.instance_name} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "user_id",
      header: "发起人",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.user_id ? (
          <UserPopover userId={row.original.user_id} username={row.original.username} />
        ) : (
          <span className="text-muted-foreground">系统</span>
        ),
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: false,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: "finished_at",
      header: "完成时间",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.finished_at ? formatDate(row.original.finished_at) : <span className="text-muted-foreground">-</span>,
    },
  ], [formatDate])

  // 状态多选：以逗号分隔字符串存入 columnFilters（兼容 URL 同步与重置按钮）
  const { setColumnFilters } = table
  const statusValue = table.columnFilters.find((f) => f.id === "status")?.value as string | undefined
  const statusSelected = useMemo(() => (statusValue ? statusValue.split(",") : []), [statusValue])
  const setStatusSelected = useCallback((vals: string[]) => {
    setColumnFilters((prev) => {
      const next = prev.filter((f) => f.id !== "status")
      if (vals.length) next.push({ id: "status", value: vals.join(",") })
      return next
    })
  }, [setColumnFilters])

  const renderExpanded = useCallback((task: TaskTaskItem) => (
    <div className="p-4">
      <LogViewer
        wsUrl={`/api/v1/admin/tasks/${task.id}/logs`}
        className="h-72"
      />
    </div>
  ), [])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">任务管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看系统异步任务的执行状态与日志，点击任意行展开查看实时日志</p>
      </div>

      <StatCards stats={stats} />

      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        enableSorting={false}
        getRowId={(t) => String(t.id)}
        renderExpanded={renderExpanded}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[calc(50%-0.25rem)] sm:w-[150px]">
              <MultiSelect
                options={taskStatusOptions}
                value={statusSelected}
                onChange={setStatusSelected}
                placeholder="状态筛选"
                searchPlaceholder="搜索状态..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} size="sm" />
              <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground cursor-pointer">自动刷新</Label>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={clearing}>
                  <Trash2 className="size-3.5" />
                  清理已完成
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清理已完成任务</AlertDialogTitle>
                  <AlertDialogDescription>
                    将清空 30 天前已完成或失败任务的日志和结果，保留任务元数据供审计追溯。此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>确认清理</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />
    </div>
  )
}
