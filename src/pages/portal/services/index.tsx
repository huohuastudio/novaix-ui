import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { Package, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ServicePortalModuleService } from "@/api"
import { getPortalServicesOptions } from "@/api/@tanstack/react-query.gen"
import { SimplePagination } from "@/components/simple-pagination"
import { EmptyState } from "@/components/empty-state"
import { useSiteName, useFormatDate } from "@/hooks/use-site-settings"
import { usePortalBusinessMode } from "@/hooks/use-portal-business-mode"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { formatDisk, formatMemory } from "@/lib/utils"
import {
  serviceStatusConfig,
  serviceStatusOptions,
  unknownServiceStatus,
  type ServiceStatusFilter,
} from "@/lib/service-constants"

function StatusIndicator({ status }: { status: string }) {
  const cfg = serviceStatusConfig[status] ?? unknownServiceStatus
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

/** 规格摘要：仅展示有值的项，非主机类服务可能全部为空 */
function specParts(svc: ServicePortalModuleService): string[] {
  const spec = svc.spec
  const parts: string[] = []
  if (spec?.cpu) parts.push(`${spec.cpu} vCPU`)
  if (spec?.memory) parts.push(formatMemory(spec.memory))
  if (spec?.disk) parts.push(formatDisk(spec.disk))
  if (spec?.bandwidth) parts.push(`${spec.bandwidth} Mbps`)
  return parts
}

function ServiceCard({ service }: { service: ServicePortalModuleService }) {
  const formatDate = useFormatDate()
  const status = service.status ?? ""
  const processing = service.operation?.status === "processing"
  const address = service.ip_address || service.ipv6_address || ""
  const parts = specParts(service)

  return (
    <Link
      to={`/portal/services/${service.id}`}
      className="group block rounded-2xl bg-background p-5 transition-colors hover:bg-foreground/[.05]"
    >
      {/* 第一行：名称 + 状态 */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold truncate min-w-0">{service.name || `服务 #${service.id}`}</h3>
        <span className="shrink-0">
          {processing ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500" />
              处理中
            </span>
          ) : (
            <StatusIndicator status={status} />
          )}
        </span>
      </div>

      {/* IP */}
      <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
        {address || (status === "pending" ? "正在开通" : "未分配 IP")}
      </p>

      {/* 规格 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 text-xs text-muted-foreground">
        {parts.length > 0 ? (
          parts.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-3">
              {i > 0 && <span className="text-border/60">·</span>}
              {p}
            </span>
          ))
        ) : (
          <span>{service.spec?.region || service.os || "—"}</span>
        )}
      </div>

      {/* 底部信息 */}
      <p className="mt-2 text-xs text-muted-foreground/70">
        {[
          parts.length > 0 ? service.spec?.region : undefined,
          service.os,
          service.expire_at && `到期 ${formatDate(service.expire_at)}`,
          service.auto_renew ? "自动续费" : undefined,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </Link>
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

export default function PortalServices() {
  const siteName = useSiteName()
  useDocumentTitle(`我的服务 - ${siteName}`)
  const { shop: purchasable } = usePortalBusinessMode()

  const [page, setPage] = useState(1)
  const pageSize = 12
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceStatusFilter>("all")

  const listQuery = useQuery({
    ...getPortalServicesOptions({
      query: {
        page,
        page_size: pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
      },
    }),
    placeholderData: keepPreviousData,
    // 存在开通中或操作处理中的服务时轮询刷新
    refetchInterval: (query) => {
      const items = query.state.data?.data?.items ?? []
      return items.some((s) => s.status === "pending" || s.status === "terminating" || s.operation?.status === "processing")
        ? 10_000
        : false
    },
  })
  const services = listQuery.data?.data?.items ?? []
  const total = listQuery.data?.data?.total ?? 0

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">我的服务</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理您购买的所有服务</p>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as "all" | ServiceStatusFilter); setPage(1) }}
        >
          <SelectTrigger className="w-full sm:w-36 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="shadow-sm ring-0">
            {serviceStatusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {purchasable && (
          <Button asChild>
            <Link to="/portal/purchase/services">
              <Plus className="size-4" />
              选购
            </Link>
          </Button>
        )}
      </div>
    </div>
  )

  if (listQuery.isPending) {
    return (
      <div className="space-y-6">
        {header}
        <ListSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      {services.length === 0 ? (
        statusFilter !== "all" ? (
          <EmptyState icon={Package} title="暂无符合条件的服务" description="试试切换其他状态筛选" />
        ) : (
          <EmptyState
            icon={Package}
            title="暂无服务"
            description="购买后的服务将显示在这里"
            action={purchasable ? { label: "去选购", href: "/portal/purchase/services" } : undefined}
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((svc) => (
              <ServiceCard key={svc.id} service={svc} />
            ))}
          </div>
          <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}
    </div>
  )
}
