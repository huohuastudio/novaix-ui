import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBytes } from "@/lib/utils"
import { incus, incusErrorMessage } from "@/lib/incus"
import { toast } from "sonner"
import type { IncusNetworkDetail } from "@/types/incus"

interface Props {
  nodeId: number
}

interface NetworkState {
  addresses?: { family: string; address: string; netmask: string; scope: string }[]
  counters?: { bytes_received: number; bytes_sent: number; packets_received: number; packets_sent: number }
  state?: string
  type?: string
  mtu?: number
  hwaddr?: string
}

interface DHCPLease {
  hostname: string
  hwaddr: string
  address: string
  type: string
}

function NetworkSection({ net, nodeId }: { net: IncusNetworkDetail; nodeId: number }) {
  const [state, setState] = useState<NetworkState | null>(null)
  const [leases, setLeases] = useState<DHCPLease[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [s, l] = await Promise.all([
        incus<NetworkState>(nodeId, `1.0/networks/${net.name}/state`).catch(() => null),
        net.managed
          ? incus<DHCPLease[]>(nodeId, `1.0/networks/${net.name}/leases`).catch(() => [])
          : Promise.resolve([]),
      ])
      if (!cancelled) {
        setState(s)
        setLeases(l ?? [])
      }
    })()
    return () => { cancelled = true }
  }, [nodeId, net.name, net.managed])

  const configEntries = Object.entries(net.config ?? {}).filter(
    ([k]) => !k.startsWith("volatile."),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{net.name}</h3>
          <Badge variant="outline">{net.type}</Badge>
          {net.managed && <Badge variant="secondary">托管</Badge>}
          {net.status && <Badge variant={net.status === "Created" ? "default" : "secondary"}>{net.status}</Badge>}
        </div>
        <span className="text-sm text-muted-foreground">{net.used_by?.length ?? 0} 个引用</span>
      </div>

      {net.description && (
        <p className="text-sm text-muted-foreground">{net.description}</p>
      )}

      {/* Quick info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
        {net.config?.["ipv4.address"] && (
          <div>
            <div className="text-muted-foreground">IPv4 地址</div>
            <div className="font-medium font-mono">{net.config["ipv4.address"]}</div>
          </div>
        )}
        {net.config?.["ipv6.address"] && (
          <div>
            <div className="text-muted-foreground">IPv6 地址</div>
            <div className="font-medium font-mono">{net.config["ipv6.address"]}</div>
          </div>
        )}
        {state?.hwaddr && (
          <div>
            <div className="text-muted-foreground">MAC 地址</div>
            <div className="font-medium font-mono">{state.hwaddr}</div>
          </div>
        )}
        {state?.mtu && (
          <div>
            <div className="text-muted-foreground">MTU</div>
            <div className="font-medium">{state.mtu}</div>
          </div>
        )}
        {net.config?.["ipv4.nat"] && (
          <div>
            <div className="text-muted-foreground">IPv4 NAT</div>
            <div className="font-medium">{net.config["ipv4.nat"]}</div>
          </div>
        )}
        {net.config?.["ipv6.nat"] && (
          <div>
            <div className="text-muted-foreground">IPv6 NAT</div>
            <div className="font-medium">{net.config["ipv6.nat"]}</div>
          </div>
        )}
      </div>

      {/* Traffic counters */}
      {state?.counters && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">接收流量</div>
            <div className="font-medium">{formatBytes(state.counters.bytes_received)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">发送流量</div>
            <div className="font-medium">{formatBytes(state.counters.bytes_sent)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">接收包数</div>
            <div className="font-medium tabular-nums">{state.counters.packets_received.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">发送包数</div>
            <div className="font-medium tabular-nums">{state.counters.packets_sent.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* DHCP Leases */}
      {net.managed && leases.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">DHCP 租约</h4>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>主机名</TableHead>
                  <TableHead>IP 地址</TableHead>
                  <TableHead>MAC 地址</TableHead>
                  <TableHead>类型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{lease.hostname || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{lease.address}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{lease.hwaddr}</TableCell>
                    <TableCell className="text-muted-foreground">{lease.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Config */}
      {configEntries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">配置</h4>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">配置项</TableHead>
                  <TableHead>值</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configEntries.map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-mono text-sm">{key}</TableCell>
                    <TableCell className="text-muted-foreground">{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

export function NetworkTableSkeleton() {
  return (
    <div className="space-y-0">
      {[0, 1].map((idx) => (
        <div key={idx}>
          {idx > 0 && <Separator className="my-8" />}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NodeNetworkTable({ nodeId }: Props) {
  const [networks, setNetworks] = useState<IncusNetworkDetail[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNetworks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await incus<IncusNetworkDetail[]>(nodeId, "1.0/networks", { params: { recursion: "1" } })
      setNetworks(data ?? [])
    } catch (err) {
      toast.error(incusErrorMessage(err, "获取网络列表失败"))
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据获取模式需在 effect 中触发加载状态
    fetchNetworks()
  }, [fetchNetworks])

  if (loading) {
    return <NetworkTableSkeleton />
  }

  if (networks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">暂无网络</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {networks.map((net, i) => (
        <div key={net.name}>
          {i > 0 && <Separator className="my-8" />}
          <NetworkSection net={net} nodeId={nodeId} />
        </div>
      ))}
    </div>
  )
}
