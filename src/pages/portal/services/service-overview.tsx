import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff } from "lucide-react"
import type { ServicePortalModuleService, ServiceServiceSpec } from "@/api"
import {
  getPortalServicesByIdSecretsOptions,
  getPortalServicesByIdSecretsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { CopyButton } from "@/components/copy-button"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"
import { billingCycleMap } from "@/lib/order-constants"
import { formatDisk, formatMemory } from "@/lib/utils"

function MetricTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-background p-4 sm:p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-1">
        <span className="text-xl sm:text-2xl font-semibold tracking-tight tabular-nums whitespace-nowrap">{value}</span>
        {unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`text-xs font-medium break-all text-right ${mono ? "font-mono" : ""}`}>{value || "-"}</span>
        {copyable && value && <CopyButton value={value} />}
      </div>
    </div>
  )
}

/** 访问信息：地址、端口、用户名与登录凭据（凭据点击后才请求，隐藏时清除缓存） */
function AccessSection({ service }: { service: ServicePortalModuleService }) {
  const queryClient = useQueryClient()
  const [revealed, setRevealed] = useState(false)
  const secretsKey = getPortalServicesByIdSecretsQueryKey({ path: { id: service.id ?? 0 } })
  const secretsQuery = useQuery({
    ...getPortalServicesByIdSecretsOptions({ path: { id: service.id ?? 0 } }),
    enabled: revealed && !!service.id,
    staleTime: 0,
    gcTime: 0,
  })
  useQueryErrorToast(secretsQuery.error, "获取凭据失败")
  const secrets = (secretsQuery.data?.data ?? []).filter((s) => s.value)
  const loadingSecrets = revealed && secretsQuery.isFetching

  const hideSecrets = () => {
    setRevealed(false)
    queryClient.removeQueries({ queryKey: secretsKey })
  }

  const hasAccess = !!(service.ip_address || service.ipv6_address || service.port || service.username || service.has_secrets)
  if (!hasAccess) return null

  const toggleButton = (
    <button
      type="button"
      aria-label={revealed ? "隐藏凭据" : "显示凭据"}
      onClick={revealed ? hideSecrets : () => setRevealed(true)}
      disabled={loadingSecrets}
      className="text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
    </button>
  )

  return (
    <section>
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">访问信息</h2>
      <div className="rounded-2xl bg-background divide-y divide-border/50">
        <InfoRow label="IP 地址" value={service.ip_address ?? ""} mono copyable />
        {service.ipv6_address && <InfoRow label="IPv6 地址" value={service.ipv6_address} mono copyable />}
        {service.port && <InfoRow label="端口" value={service.port} mono copyable />}
        {service.username && <InfoRow label="用户名" value={service.username} mono copyable />}

        {service.has_secrets && (
          revealed && secretsQuery.isSuccess && secrets.length > 0 ? (
            secrets.map((s, i) => (
              <div key={s.key ?? i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <span className="text-xs text-muted-foreground shrink-0">{s.label || s.key}</span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded select-all break-all">{s.value}</code>
                  <CopyButton value={s.value ?? ""} />
                  {i === 0 && toggleButton}
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs text-muted-foreground">密码</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium font-mono">
                  {revealed && secretsQuery.isSuccess ? "暂无密码记录" : "••••••••"}
                </span>
                {toggleButton}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  )
}

function ResourceSection({ spec }: { spec?: ServiceServiceSpec }) {
  if (!spec || !(spec.cpu || spec.memory || spec.disk || spec.bandwidth)) return null
  return (
    <section>
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">资源配置</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile label="CPU" value={spec.cpu ? String(spec.cpu) : "-"} unit={spec.cpu ? "vCPU" : undefined} />
        <MetricTile label="内存" value={spec.memory ? formatMemory(spec.memory) : "-"} />
        <MetricTile label="磁盘" value={spec.disk ? formatDisk(spec.disk) : "-"} />
        <MetricTile
          label="带宽"
          value={spec.bandwidth ? String(spec.bandwidth) : "-"}
          unit={spec.bandwidth ? "Mbps" : undefined}
        />
      </div>
      {(spec.traffic ?? 0) > 0 && (
        <div className="rounded-2xl bg-background p-5 mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">每月流量</span>
            <span className="font-medium tabular-nums">{spec.traffic} GB</span>
          </div>
        </div>
      )}
    </section>
  )
}

function InfoSection({ service }: { service: ServicePortalModuleService }) {
  const formatDate = useFormatDate()
  const formatAmount = useFormatAmount()
  const extraFields = (service.fields ?? []).filter((f) => f.value)

  return (
    <section>
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">详细信息</h2>
      <div className="rounded-2xl bg-background divide-y divide-border/50">
        {service.spec?.region && <InfoRow label="地域" value={service.spec.region} />}
        {service.os && <InfoRow label="操作系统" value={service.os} />}
        {service.hostname && <InfoRow label="主机名" value={service.hostname} mono copyable />}
        {extraFields.map((f, i) => (
          <InfoRow key={f.key ?? i} label={f.label || f.key || ""} value={f.value ?? ""} copyable={f.copyable} />
        ))}
        <InfoRow label="计费周期" value={billingCycleMap[service.billing_cycle ?? ""] ?? service.billing_cycle ?? "-"} />
        {(service.renew_price ?? 0) > 0 && <InfoRow label="续费价格" value={formatAmount(service.renew_price)} />}
        <InfoRow label="到期时间" value={formatDate(service.expire_at)} />
        {service.activated_at && <InfoRow label="开通时间" value={formatDate(service.activated_at)} />}
        <InfoRow label="创建时间" value={formatDate(service.created_at)} />
      </div>
    </section>
  )
}

export function ServiceOverview({ service }: { service: ServicePortalModuleService }) {
  return (
    <>
      <AccessSection service={service} />
      <ResourceSection spec={service.spec} />
      <InfoSection service={service} />
    </>
  )
}
