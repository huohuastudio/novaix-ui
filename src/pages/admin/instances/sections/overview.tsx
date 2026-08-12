import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, ArrowRightLeft } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  postAdminInstancesByIdChangeIp,
  postAdminInstancesByIdUnthrottle,
  postAdminInstancesByIdIps,
  putAdminInstancesByIdHa,
} from "@/api"
import type { InstanceInstanceItem, IppoolFreeIpItem } from "@/api"
import { getAdminInstancesByIdIpsQueryKey } from "@/api/@tanstack/react-query.gen"
import { formatBytes, formatMemory, formatDisk, getErrorMessage} from "@/lib/utils"
import { MetricBar } from "@/components/metric-bar"
import { useInstanceState } from "@/hooks/use-instance-state"
import { useTasks } from "@/hooks/use-tasks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CopyButton } from "@/components/copy-button"
import { useFormatDate } from "@/hooks/use-site-settings"
import { AdminIpList } from "../components/ip-list"
import { FreeIpPickerDialog } from "../components/free-ip-picker-dialog"
import { getStatusInfo, getTypeLabel } from "@/lib/instance-constants"
export function OverviewTab({ instance, onRefresh }: { instance: InstanceInstanceItem; onRefresh: () => void }) {
  const formatDate = useFormatDate()
  const queryClient = useQueryClient()
  const [changeIPOpen, setChangeIPOpen] = useState(false)
  const [addIpOpen, setAddIpOpen] = useState(false)
  const [unthrottling, setUnthrottling] = useState(false)
  const status = getStatusInfo(instance.status)
  const isRunning = instance.status === "running"
  const state = useInstanceState(instance.id, isRunning)
  const { addTask } = useTasks()
  // IP 变更后失效 IP 列表缓存（替代原先的 key 强刷重挂载机制）
  const refreshIpList = () => {
    queryClient.invalidateQueries({
      queryKey: getAdminInstancesByIdIpsQueryKey({ path: { id: instance.id! } }),
    })
  }
  const handleChangeIP = async (ip: IppoolFreeIpItem) => {
    try {
      const { data: res } = await postAdminInstancesByIdChangeIp({
        path: { id: instance.id! },
        body: { ip_id: ip.id! },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "change_ip")
        toast.success("更换 IP 任务已提交", { description: `新 IP: ${ip.address}` })
        setChangeIPOpen(false)
        onRefresh()
        refreshIpList()
      } else {
        toast.error(res?.message || "更换 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }
  const handleAddIp = async (ip: IppoolFreeIpItem) => {
    try {
      const { data: res } = await postAdminInstancesByIdIps({
        path: { id: instance.id! },
        body: { ip_id: ip.id! },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "add_ip")
        toast.success("添加 IP 任务已提交", { description: `IP: ${ip.address}` })
        setAddIpOpen(false)
        onRefresh()
        refreshIpList()
      } else {
        toast.error(res?.message || "添加 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }
  const doUnthrottle = async () => {
    setUnthrottling(true)
    try {
      const { data: res } = await postAdminInstancesByIdUnthrottle({ path: { id: instance.id! } })
      if (res?.code === 0) {
        toast.success("解除限速任务已提交")
        onRefresh()
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setUnthrottling(false)
    }
  }
  const handleToggleHA = async (enabled: boolean) => {
    try {
      const { data: res } = await putAdminInstancesByIdHa({
        path: { id: instance.id! },
        body: { enabled },
      })
      if (res?.code === 0) {
        toast.success(enabled ? "已开启高可用保护" : "已关闭高可用保护")
        onRefresh()
      } else {
        toast.error(res?.message || "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    }
  }
  const trafficPercent = instance.traffic_limit
    ? Math.min(((instance.traffic_used ?? 0) / instance.traffic_limit) * 100, 100)
    : 0
  const memPercent = state?.mem_total ? ((state.mem_used ?? 0) / state.mem_total) * 100 : 0
  const diskUsed = state?.disk_used ?? 0
  const diskPercent = state?.disk_total && diskUsed >= 0 ? (diskUsed / state.disk_total) * 100 : 0
  return (
    <div className="space-y-0">
      {isRunning && (
        <>
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">运行状态</h3>
              <p className="text-sm text-muted-foreground mt-1">
                实时资源使用情况
                {state?.uptime && <span> · 已运行 {state.uptime}</span>}
              </p>
            </div>
            {state ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 max-w-3xl">
                  <MetricBar
                    label="CPU"
                    percent={0}
                    value={`${((state.cpu_usage ?? 0) / 1e9).toFixed(2)}s`}
                    sub={`${instance.cpu ?? 0} 核心`}
                  />
                  <MetricBar
                    label="内存"
                    percent={memPercent}
                    value={`${formatBytes(state.mem_used ?? 0)} / ${formatMemory(instance.memory ?? 0)}`}
                    sub={`${Math.round(memPercent)}% 使用率`}
                  />
                  {(state.disk_used || state.disk_total || instance.disk) ? (
                    <MetricBar
                      label="系统盘"
                      percent={diskUsed >= 0 ? diskPercent : 0}
                      value={`${formatBytes(state.disk_used ?? 0)} / ${formatDisk(instance.disk ?? 0)}`}
                      sub={diskUsed < 0 ? '统计不可用' : state.disk_total ? `${Math.round(diskPercent)}% 使用率` : '用量暂不可用'}
                    />
                  ) : null}
                  {state.volumes?.map((vol) => {
                    const pct = vol.total ? ((vol.used ?? 0) / vol.total) * 100 : 0
                    return (
                      <MetricBar
                        key={vol.name}
                        label={`存储卷 ${vol.name}`}
                        percent={pct}
                        value={`${formatBytes(vol.used ?? 0)} / ${formatBytes(vol.total ?? 0)}`}
                        sub={`${Math.round(pct)}% 使用率`}
                      />
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 text-sm max-w-3xl">
                  <div>
                    <div className="text-muted-foreground">网络接收</div>
                    <div className="font-medium font-mono mt-0.5">{formatBytes(state.net_rx ?? 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">网络发送</div>
                    <div className="font-medium font-mono mt-0.5">{formatBytes(state.net_tx ?? 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">进程数</div>
                    <div className="font-medium tabular-nums mt-0.5">{state.processes ?? 0}</div>
                  </div>
                  {state.mem_swap_used ? (
                    <div>
                      <div className="text-muted-foreground">Swap 使用</div>
                      <div className="font-medium font-mono mt-0.5">{formatBytes(state.mem_swap_used)}</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-muted-foreground">PID</div>
                    <div className="font-medium tabular-nums mt-0.5">{state.pid ?? "-"}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 max-w-3xl">
                {["CPU", "内存", "磁盘"].map(label => (
                  <div key={label} className="space-y-1">
                    <Skeleton className="h-3.5 w-10" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <Separator className="my-8" />
        </>
      )}
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">资源配额</h3>
          <p className="text-sm text-muted-foreground mt-1">实例的资源分配情况</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">CPU</div>
            <div className="text-2xl font-bold tabular-nums">{instance.cpu ?? 0}</div>
            <div className="text-xs text-muted-foreground">核心</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">内存</div>
            <div className="text-2xl font-bold tabular-nums">{formatMemory(instance.memory ?? 0)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">磁盘</div>
            <div className="text-2xl font-bold tabular-nums">{formatDisk(instance.disk ?? 0)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">带宽</div>
            <div className="text-2xl font-bold tabular-nums">
              {instance.bandwidth ? `${instance.bandwidth} Mbps` : "不限"}
            </div>
          </div>
        </div>
        {(instance.traffic_limit ?? 0) > 0 && (
          <div className="max-w-md space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                流量使用
                {instance.traffic_throttled && (
                  <span className="ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">已限速</span>
                )}
              </span>
              <span className="text-sm tabular-nums font-medium">
                {formatDisk(instance.traffic_used ?? 0)} / {formatDisk(instance.traffic_limit ?? 0)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${instance.traffic_throttled ? "bg-amber-500" : trafficPercent >= 80 ? "bg-orange-500" : "bg-primary"}`}
                style={{ width: `${trafficPercent}%` }}
              />
            </div>
            {instance.traffic_throttled && (
              <Button variant="outline" onClick={doUnthrottle} disabled={unthrottling} className="mt-2">
                {unthrottling && <Spinner />}
                解除限速
              </Button>
            )}
          </div>
        )}
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">基本信息</h3>
          <p className="text-sm text-muted-foreground mt-1">实例的详细属性</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-4xl">
          <div className="min-w-0">
            <div className="text-muted-foreground">实例名称</div>
            <div className="font-medium mt-0.5 truncate" title={instance.name}>{instance.name || "-"}</div>
          </div>
          <div className="min-w-0">
            <div className="text-muted-foreground">主机名</div>
            <div className="font-medium mt-0.5 truncate" title={state?.os_info?.hostname || instance.hostname}>{state?.os_info?.hostname || instance.hostname || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">类型</div>
            <div className="font-medium mt-0.5">{getTypeLabel(instance.type)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">架构</div>
            <div className="font-medium mt-0.5">{instance.arch || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">状态</div>
            <div className="mt-1">
              <Badge variant={status.variant}>
                {instance.status === "creating" && <Spinner size="sm" />}
                {status.label}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">操作系统</div>
            <div className="font-medium mt-0.5">
              {state?.os_info ? [state.os_info.os, state.os_info.os_version].filter(Boolean).join(" ") || "-" : (instance.os_type || "-")}
            </div>
          </div>
          {state?.os_info?.kernel_version && (
            <div>
              <div className="text-muted-foreground">内核版本</div>
              <div className="font-medium mt-0.5">{state.os_info.kernel_version}</div>
            </div>
          )}
        </div>
        {instance.node_group_id && (
          <div className="flex items-center gap-3 max-w-4xl pt-2">
            <Switch
              checked={instance.ha_enabled ?? false}
              onCheckedChange={handleToggleHA}
            />
            <div className="text-sm">
              <span className="font-medium">高可用保护</span>
              <span className="text-muted-foreground ml-2">开启后节点故障时自动触发整机疏散</span>
            </div>
          </div>
        )}
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">网络信息</h3>
            <p className="text-sm text-muted-foreground mt-1">IP 地址和网络配置</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setAddIpOpen(true)}
            >
              <Plus className="size-4" />
              添加 IP
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    disabled={instance.status !== "stopped"}
                    onClick={() => setChangeIPOpen(true)}
                  >
                    <ArrowRightLeft className="size-4" />
                    更换主 IP
                  </Button>
                </span>
              </TooltipTrigger>
              {instance.status !== "stopped" && (
                <TooltipContent>需要先停止实例才能更换 IP</TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
        <AdminIpList instanceId={instance.id!} onRefresh={onRefresh} />
        <FreeIpPickerDialog
          open={changeIPOpen}
          onOpenChange={setChangeIPOpen}
          title="更换 IP 地址"
          confirmLabel="确认更换"
          onConfirm={handleChangeIP}
        />
        <FreeIpPickerDialog
          open={addIpOpen}
          onOpenChange={setAddIpOpen}
          title="添加 IP 地址"
          confirmLabel="确认添加"
          onConfirm={handleAddIp}
        />
        {instance.nat_info && (
          <>
            <div className="pt-4">
              <h4 className="text-sm font-medium mb-3">NAT 信息</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-4xl">
                <div>
                  <div className="text-muted-foreground">共享 IP</div>
                  <div className="font-medium font-mono mt-0.5">{instance.nat_info.shared_ip_address || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">SSH 端口</div>
                  <div className="font-medium font-mono mt-0.5">{instance.nat_info.ssh_port ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">可用端口</div>
                  <div className="font-medium font-mono mt-0.5">
                    {instance.nat_info.port_start != null && instance.nat_info.port_end != null
                      ? `${instance.nat_info.port_start + 1} - ${instance.nat_info.port_end}`
                      : "-"}
                  </div>
                </div>
                {instance.nat_info.ssh_command && (
                  <div className="col-span-2 sm:col-span-3">
                    <div className="text-muted-foreground">SSH 命令</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{instance.nat_info.ssh_command}</code>
                      <CopyButton value={instance.nat_info.ssh_command} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
      {(() => {
        const volumes = Object.entries(instance.devices ?? {}).filter(
          ([name, d]) => d.type === "disk" && name !== "root" && d.source,
        )
        if (volumes.length === 0) return null
        return (
          <>
            <Separator className="my-8" />
            <section className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">存储卷</h3>
                <p className="text-sm text-muted-foreground mt-1">已挂载的附加存储卷</p>
              </div>
              {volumes.map(([name, d]) => (
                <div key={name} className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 text-sm max-w-4xl">
                  <div className="min-w-0">
                    <div className="text-muted-foreground">设备名称</div>
                    <div className="font-medium mt-0.5 truncate" title={name}>{name}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted-foreground">存储卷</div>
                    <div className="font-medium mt-0.5 truncate" title={d.source}>{d.source}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted-foreground">挂载路径</div>
                    <div className="font-medium font-mono mt-0.5 truncate" title={d.path}>{d.path || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">类型</div>
                    <div className="font-medium mt-0.5">{d.path ? "文件系统" : "块设备"}</div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )
      })()}
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">关联信息</h3>
          <p className="text-sm text-muted-foreground mt-1">所属节点和镜像来源</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-4xl">
          <div>
            <div className="text-muted-foreground">所属节点</div>
            <div className="font-medium mt-0.5">{instance.node_name || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">镜像</div>
            <div className="font-medium mt-0.5">{instance.source_alias || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">描述</div>
            <div className="font-medium mt-0.5">{instance.description || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">创建时间</div>
            <div className="font-medium mt-0.5">{formatDate(instance.created_at)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">到期时间</div>
            <div className="font-medium mt-0.5">{instance.expire_at ? formatDate(instance.expire_at) : "永不过期"}</div>
          </div>
        </div>
      </section>
    </div>
  )
}
export function InstanceOverviewSkeleton() {
  return (
    <div className="space-y-0">
      <section className="space-y-5">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-36 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-40 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 max-w-4xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
      <Separator className="my-8" />
      <section className="space-y-5">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-36 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 max-w-4xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
