import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import {
  Server,
  Play,
  Square,
  RotateCcw,
  MoreHorizontal,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PortalPortalInstanceItem } from "@/api"
import {
  getPortalInstancesOptions,
  getPortalInstancesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { SimplePagination } from "@/components/simple-pagination"
import { usePortalInstanceActions, type PortalPowerAction } from "@/hooks/use-portal-instance-actions"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { useDebounce } from "@uidotdev/usehooks"
import { formatMemory } from "@/lib/utils"
import { portalStatusConfig } from "@/lib/instance-constants"
import { onPortalInstanceChange } from "@/hooks/use-portal-tasks"

function StatusIndicator({ status }: { status: string }) {
  const cfg = portalStatusConfig[status] ?? { label: "未知", color: "text-zinc-400", dot: "bg-zinc-400" }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function InstanceCard({
  instance,
  onAction,
  busy,
}: {
  instance: PortalPortalInstanceItem
  onAction: (inst: PortalPortalInstanceItem, action: PortalPowerAction) => void
  busy: boolean
}) {
  const formatDate = useFormatDate()
  const status = instance.status ?? "stopped"
  const instanceBusy = instance.active_task_id != null
  const isRunning = status === "running"
  const disabled = busy || instanceBusy

  return (
    <div className="group rounded-2xl bg-background p-5 transition-colors hover:bg-foreground/[.05]" data-tour="instance-card">
      <Link to={`/portal/servers/${instance.id}`} className="block">
        {/* 第一行：名称 + 状态 */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold truncate min-w-0">{instance.name}</h3>
          <span className="shrink-0">
            <StatusIndicator status={status} />
          </span>
        </div>

        {/* IP */}
        <p className="text-[13px] text-muted-foreground mt-1 font-mono">
          {instance.ip_address || instance.ipv6_address || "未分配 IP"}
        </p>

        {/* 配置 */}
        <div className="flex items-center gap-3 mt-4 text-[13px] text-muted-foreground">
          <span>{instance.cpu ?? 0} vCPU</span>
          <span className="text-border/60">·</span>
          <span>{formatMemory(instance.memory ?? 0)}</span>
          <span className="text-border/60">·</span>
          <span>{instance.disk ?? 0} GB</span>
        </div>

        {/* 底部信息 */}
        <div className="flex items-center gap-3 mt-2 text-[12px] text-muted-foreground/70">
          {instance.os_type && <span>{instance.os_type}</span>}
          {instance.expire_at && (
            <>
              {instance.os_type && <span className="text-border/60">·</span>}
              <span>到期 {formatDate(instance.expire_at)}</span>
            </>
          )}
        </div>
      </Link>

      {/* 操作栏 */}
      <div className="relative z-10 flex items-center justify-end gap-1 mt-3 pt-3 border-t border-transparent group-hover:border-border/40 transition-colors" data-tour="instance-actions" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1"
          disabled={disabled || isRunning}
          onClick={() => onAction(instance, "start")}
        >
          <Play className="size-3" />
          启动
        </Button>
        <Button
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1"
          disabled={disabled || !isRunning}
          onClick={() => onAction(instance, "restart")}
        >
          <RotateCcw className="size-3" />
          重启
        </Button>
        <Button
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1"
          disabled={disabled || !isRunning}
          onClick={() => onAction(instance, "stop")}
        >
          <Square className="size-3" />
          停止
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="shadow-sm ring-0">
            <DropdownMenuItem asChild>
              <Link to={`/portal/servers/${instance.id}`}>查看详情</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/portal/servers/${instance.id}/terminal`}>打开终端</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/portal/servers/${instance.id}/snapshots`}>快照管理</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-background p-5">
          <div className="flex justify-between">
            <Skeleton className="h-[18px] w-28" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-4 w-32 mt-2" />
          <Skeleton className="h-4 w-48 mt-4" />
          <Skeleton className="h-3 w-36 mt-2" />
        </div>
      ))}
    </div>
  )
}

export default function PortalInstances() {
  const siteName = useSiteName()
  useDocumentTitle(`云服务器 - ${siteName}`)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const pageSize = 12
  const [keyword, setKeyword] = useState("")
  const debouncedKeyword = useDebounce(keyword, 300)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 搜索关键词变化时重置页码
    setPage(1)
  }, [debouncedKeyword])

  const listQuery = useQuery({
    ...getPortalInstancesOptions({
      query: {
        page,
        page_size: pageSize,
        keyword: debouncedKeyword || undefined,
      },
    }),
    placeholderData: keepPreviousData,
    // 存在过渡状态的实例（有进行中任务）时轮询刷新
    refetchInterval: (query) => {
      const items = query.state.data?.data?.items ?? []
      return items.some((i) => i.active_task_id != null) ? 10_000 : false
    },
  })
  const instances = listQuery.data?.data?.items ?? []
  const total = listQuery.data?.data?.total ?? 0

  // 后台静默刷新实例列表（失效所有分页/搜索组合的缓存）
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getPortalInstancesQueryKey() })
  }, [queryClient])

  const { handlePowerAction, loadingId, ConfirmDialog } = usePortalInstanceActions(invalidateList)

  // SSE 事件驱动刷新（防抖合并连续事件）
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const cleanup = onPortalInstanceChange(() => {
      clearTimeout(timer)
      timer = setTimeout(invalidateList, 800)
    })
    return () => { clearTimeout(timer); cleanup() }
  }, [invalidateList])

  if (listQuery.isPending) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">云服务器</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理您的所有云服务器</p>
        </div>
        <ListSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">云服务器</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理您的所有云服务器</p>
        </div>
        <div className="relative w-full sm:w-60" data-tour="instance-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索名称或 IP..."
            className="pl-9"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Server className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无云服务器</h3>
          <p className="text-sm text-muted-foreground mt-1">创建您的第一台云服务器，开始使用云计算服务</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {instances.map((inst) => (
              <InstanceCard
                key={inst.id}
                instance={inst}
                onAction={handlePowerAction}
                busy={loadingId === inst.id}
              />
            ))}
          </div>
          <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}

      {ConfirmDialog}
    </div>
  )
}
