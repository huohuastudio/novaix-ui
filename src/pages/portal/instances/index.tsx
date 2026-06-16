import { useEffect, useState, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import {
  Server,
  Play,
  Square,
  RotateCcw,
  MoreHorizontal,
  Loader2,
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
import { getPortalInstances } from "@/api"
import type { PortalPortalInstanceItem } from "@/api"
import { SimplePagination } from "@/components/simple-pagination"
import { usePortalInstanceActions, type PortalPowerAction } from "@/hooks/use-portal-instance-actions"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { useDebounce } from "@uidotdev/usehooks"
import { formatMemory } from "@/lib/utils"
import { portalStatusConfig } from "@/lib/instance-constants"

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
  const isRunning = status === "running"
  const isStopped = status === "stopped" || status === "frozen"

  return (
    <div className="group rounded-2xl bg-background p-5 transition-colors hover:bg-foreground/[.05]">
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
          {instance.ip_address || "未分配 IP"}
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
      <div className="relative z-10 flex items-center justify-end gap-1 mt-3 pt-3 border-t border-transparent group-hover:border-border/40 transition-colors" onClick={(e) => e.stopPropagation()}>
        {isStopped && (
          <Button
            variant="ghost"
            className="h-7 px-2.5 text-xs gap-1"
            disabled={busy}
            onClick={() => onAction(instance, "start")}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
            启动
          </Button>
        )}
        {isRunning && (
          <>
            <Button
              variant="ghost"
              className="h-7 px-2.5 text-xs gap-1"
              disabled={busy}
              onClick={() => onAction(instance, "restart")}
            >
              {busy ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
              重启
            </Button>
            <Button
              variant="ghost"
              className="h-7 px-2.5 text-xs gap-1 text-red-600 hover:text-red-600 dark:text-red-400"
              disabled={busy}
              onClick={() => onAction(instance, "stop")}
            >
              <Square className="size-3" />
              停止
            </Button>
          </>
        )}
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

  const [instances, setInstances] = useState<PortalPortalInstanceItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const debouncedKeyword = useDebounce(keyword, 300)

  const seqRef = useRef(0)

  const fetchInstances = useCallback(async (search: string, p: number) => {
    const seq = ++seqRef.current
    try {
      const { data: res } = await getPortalInstances({
        query: {
          page: p,
          page_size: pageSize,
          keyword: search || undefined,
        },
      })
      if (seq !== seqRef.current) return
      setInstances(res?.data?.items ?? [])
      setTotal(res?.data?.total ?? 0)
    } finally {
      if (seq === seqRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 搜索关键词变化时重置页码
    setPage(1)
  }, [debouncedKeyword])

  useEffect(() => {
    fetchInstances(debouncedKeyword, page)
  }, [fetchInstances, debouncedKeyword, page])

  const { handlePowerAction, loadingId, ConfirmDialog } = usePortalInstanceActions(() => fetchInstances(debouncedKeyword, page))

  const hasTransitional = instances.some((i) => i.status === "creating")

  useEffect(() => {
    if (!hasTransitional) return
    const timer = setInterval(() => {
      fetchInstances(debouncedKeyword, page)
    }, 5000)
    return () => clearInterval(timer)
  }, [hasTransitional, fetchInstances, debouncedKeyword, page])

  if (loading) {
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
        <div className="relative w-full sm:w-60">
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
