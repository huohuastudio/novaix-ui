import type { PortalPortalInstanceItem } from "@/api"
import { formatBytes, formatMemory, formatDisk } from "@/lib/utils"
import { usePortalInstanceState } from "@/hooks/use-portal-instance-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useFormatDate } from "@/hooks/use-site-settings"
import { billingCycleMap } from "@/lib/order-constants"
import { CopyButton } from "@/components/copy-button"
import { ManageSection } from "./manage-section"
import { NetworkSection } from "./network-section"

function MetricTile({
  label,
  value,
  unit,
  percent,
}: {
  label: string
  value: string
  unit?: string
  percent?: number
}) {
  return (
    <div className="rounded-2xl bg-background p-5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-[13px] text-muted-foreground">{unit}</span>}
      </div>
      {percent !== undefined && (
        <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground/80 transition-all duration-700"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function OverviewTab({ instance, onRefresh }: { instance: PortalPortalInstanceItem; onRefresh: () => void }) {
  const formatDate = useFormatDate()
  const isRunning = instance.status === "running"
  const state = usePortalInstanceState(instance.id, isRunning)

  const memPercent = state?.mem_total ? ((state.mem_used ?? 0) / state.mem_total) * 100 : 0
  const diskPercent = state?.disk_total ? ((state.disk_used ?? 0) / state.disk_total) * 100 : 0
  const trafficTotal = (instance.traffic_limit ?? 0) + (instance.traffic_extra ?? 0)
  const trafficPercent = trafficTotal
    ? Math.min(((instance.traffic_used ?? 0) / trafficTotal) * 100, 100)
    : 0

  return (
    <div className="space-y-8">
      {/* 实时监控 */}
      {isRunning && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">实时监控</h2>
            {state?.uptime && (
              <span className="text-[12px] text-muted-foreground">运行 {state.uptime}</span>
            )}
          </div>
          {state ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricTile
                label="CPU 累计"
                value={((state.cpu_usage ?? 0) / 1e9).toFixed(1)}
                unit={`秒 · ${instance.cpu ?? 0} 核`}
              />
              <MetricTile
                label="内存"
                value={formatBytes(state.mem_used ?? 0)}
                unit={`/ ${formatMemory(instance.memory ?? 0)}`}
                percent={memPercent}
              />
              <MetricTile
                label="磁盘"
                value={formatBytes(state.disk_used ?? 0)}
                unit={`/ ${formatDisk(instance.disk ?? 0)}`}
                percent={state.disk_total ? diskPercent : undefined}
              />
              <MetricTile
                label="网络"
                value={`↓ ${formatBytes(state.net_rx ?? 0)}`}
                unit={`↑ ${formatBytes(state.net_tx ?? 0)}`}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-background p-5">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-7 w-20 mt-2" />
                  <Skeleton className="h-1 w-full rounded-full mt-3" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 资源配置 */}
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">资源配置</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="CPU" value={String(instance.cpu ?? 0)} unit="vCPU" />
          <MetricTile label="内存" value={formatMemory(instance.memory ?? 0)} />
          <MetricTile label="磁盘" value={formatDisk(instance.disk ?? 0)} />
          <MetricTile
            label="带宽"
            value={instance.bandwidth ? String(instance.bandwidth) : "不限"}
            unit={instance.bandwidth ? "Mbps" : undefined}
          />
        </div>
        {(instance.traffic_limit ?? 0) > 0 && (
          <div className="rounded-2xl bg-background p-5 mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-muted-foreground">
                流量
                {instance.traffic_throttled && (
                  <span className="ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">已限速</span>
                )}
              </span>
              <span className="text-[13px] tabular-nums">
                {formatDisk(instance.traffic_used ?? 0)} / {formatDisk(trafficTotal)}
              </span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${instance.traffic_throttled ? "bg-amber-500" : trafficPercent >= 80 ? "bg-orange-500" : "bg-foreground/80"}`}
                style={{ width: `${trafficPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 网络 */}
      <NetworkSection instance={instance} onRefresh={onRefresh} />

      {/* NAT 信息 */}
      {instance.nat_info && (
        <section>
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">连接信息</h2>
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-muted-foreground">连接地址</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium font-mono">
                  {instance.nat_info.shared_ip_address}:{instance.nat_info.ssh_port}
                </span>
                <CopyButton value={`${instance.nat_info.shared_ip_address}:${instance.nat_info.ssh_port}`} />
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-[13px] text-muted-foreground">可用端口</span>
              <span className="text-[13px] font-medium font-mono">
                {instance.nat_info.port_start != null && instance.nat_info.port_end != null
                  ? `${instance.nat_info.port_start + 1} - ${instance.nat_info.port_end}`
                  : "-"}
              </span>
            </div>
            {instance.nat_info.ssh_command && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[13px] text-muted-foreground">SSH 命令</span>
                <div className="flex items-center gap-1.5">
                  <code className="text-[12px] font-mono bg-muted px-2 py-0.5 rounded">{instance.nat_info.ssh_command}</code>
                  <CopyButton value={instance.nat_info.ssh_command} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 详细信息 */}
      <section>
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">详细信息</h2>
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          <InfoRow label="操作系统" value={
            state?.os_info
              ? [state.os_info.os, state.os_info.os_version].filter(Boolean).join(" ") || instance.os_type || "-"
              : instance.os_type || "-"
          } />
          <InfoRow label="计费周期" value={billingCycleMap[instance.billing_cycle ?? ''] ?? instance.billing_cycle ?? '-'} />
          <InfoRow label="到期时间" value={formatDate(instance.expire_at)} />
          <InfoRow label="创建时间" value={formatDate(instance.created_at)} />
          {state?.os_info?.kernel_version && (
            <InfoRow label="内核版本" value={state.os_info.kernel_version} />
          )}
        </div>
      </section>

      <ManageSection instance={instance} onRefresh={onRefresh} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium">{value}</span>
    </div>
  )
}
