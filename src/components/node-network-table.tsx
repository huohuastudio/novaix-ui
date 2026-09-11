import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { formatBytes, getErrorMessage } from "@/lib/utils"
import { incus, incusErrorMessage } from "@/lib/incus"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"
import type { IncusNetworkDetail } from "@/types/incus"
import { queryKeys } from "@/lib/query-keys"
import { postAdminNodesByIdNetworksSetup, getAdminNodesByIdNetworksDetect } from "@/api"
import { getAdminNodesByIdQueryKey, getAdminNodesByIdNetworksDetectQueryKey } from "@/api/@tanstack/react-query.gen"
import type { ServiceDetectedNetwork, ServicePhysicalInterface } from "@/api"
import { toast } from "sonner"
import { Check, Settings } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  nodeId: number
  activeNetworkName?: string
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

function SetupNetworkDialog({ nodeId, networkName, interfaces, open, onOpenChange }: {
  nodeId: number
  networkName: string
  interfaces: ServicePhysicalInterface[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<"nat" | "public">("nat")
  const [sharedIP, setSharedIP] = useState("")
  const [gateway, setGateway] = useState("")
  const [cidr, setCidr] = useState("")
  const [dns1, setDns1] = useState("8.8.8.8")
  const [dns2, setDns2] = useState("8.8.4.4")
  const [parentInterface, setParentInterface] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const { data: res } = await postAdminNodesByIdNetworksSetup({
        path: { id: nodeId },
        body: {
          mode,
          network_name: networkName,
          ...(mode === "nat" ? { shared_ip_address: sharedIP || undefined } : {}),
          ...(mode === "public" ? { gateway, cidr, dns1, dns2, parent_interface: parentInterface || undefined } : {}),
        },
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "配置失败")
        return
      }
      toast.success(res.data?.message ?? "网络配置成功")
      queryClient.invalidateQueries({ queryKey: getAdminNodesByIdQueryKey({ path: { id: nodeId } }) })
      queryClient.invalidateQueries({ queryKey: queryKeys.nodeNetworks(nodeId) })
      queryClient.invalidateQueries({ queryKey: getAdminNodesByIdNetworksDetectQueryKey({ path: { id: nodeId } }) })
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, "配置失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>配置网络 {networkName}</DialogTitle>
          <DialogDescription>选择网络模式并填写必要信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <Label>网络模式</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "nat" | "public")} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="nat" id="mode-nat" />
                <Label htmlFor="mode-nat" className="font-normal cursor-pointer">NAT 模式</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="public" id="mode-public" />
                <Label htmlFor="mode-public" className="font-normal cursor-pointer">公网模式</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {mode === "nat"
                ? "系统将自动配置网桥 DHCP 和 NAT，实例通过共享公网 IP 的端口转发访问外网"
                : "创建 IP 池记录网段信息，用于实例静态 IP 配置。请确保网桥已在系统层面完成公网接入配置（桥接物理网卡或配置路由）"}
            </p>
          </div>

          {mode === "nat" && (
            <div className="space-y-2">
              <Label htmlFor="shared-ip">公网 IP 地址（可选）</Label>
              <Input
                id="shared-ip"
                placeholder="如 203.0.113.1，留空稍后手动添加"
                value={sharedIP}
                onChange={(e) => setSharedIP(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">填写后将自动创建共享 IP，端口范围默认 10000-60000</p>
            </div>
          )}

          {mode === "public" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="parent-iface">上联网卡</Label>
                <Select value={parentInterface || "_none"} onValueChange={(v) => setParentInterface(v === "_none" ? "" : v)}>
                  <SelectTrigger id="parent-iface">
                    <SelectValue placeholder="选择连接公网的物理网卡" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">不指定（手动配置网桥接入）</SelectItem>
                    {interfaces.map((iface) => (
                        <SelectItem key={iface.name} value={iface.name!}>
                          {iface.name} {iface.addresses?.length ? `(${iface.addresses[0]})` : "(空闲)"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {parentInterface
                    ? (() => {
                        const iface = interfaces.find(i => i.name === parentInterface)
                        return iface?.has_address
                          ? `${parentInterface} 已有管理地址，将通过路由模式接入（Proxy ARP + IP 转发），管理地址保留不变`
                          : `系统将把 ${parentInterface} 桥接到网桥，并关闭 NAT/DHCP`
                      })()
                    : "不桥接物理网卡，请确保已在系统层面完成公网网络配置"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gateway">网关地址</Label>
                  <Input
                    id="gateway"
                    placeholder="如 203.0.113.1"
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidr">网段（CIDR）</Label>
                  <Input
                    id="cidr"
                    placeholder="如 203.0.113.0/24"
                    value={cidr}
                    onChange={(e) => setCidr(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dns1">DNS 1</Label>
                  <Input id="dns1" value={dns1} onChange={(e) => setDns1(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dns2">DNS 2</Label>
                  <Input id="dns2" value={dns2} onChange={(e) => setDns2(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">网段和网关信息将记录到 IP 池，通过 cloud-init 下发给实例。创建后需在 IP 池管理中生成具体 IP</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Spinner size="sm" className="mr-1" />}
            确认配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NetworkSection({ net, nodeId, activeNetworkName, detectInfo, interfaces }: {
  net: IncusNetworkDetail
  nodeId: number
  activeNetworkName?: string
  detectInfo?: ServiceDetectedNetwork
  interfaces: ServicePhysicalInterface[]
}) {
  const [setupOpen, setSetupOpen] = useState(false)
  const isActive = activeNetworkName === net.name

  const ipPoolCount = detectInfo?.ip_pool_count ?? 0
  const sharedIPCount = detectInfo?.shared_ip_count ?? 0
  const hasResources = ipPoolCount + sharedIPCount > 0
  const showSetupButton = !isActive || !hasResources
  const buttonLabel = isActive ? "配置网络" : "使用此网络"

  const detailQuery = useQuery({
    queryKey: queryKeys.nodeNetworkState(nodeId, net.name, !!net.managed),
    queryFn: async () => {
      const [state, leases] = await Promise.all([
        incus<NetworkState>(nodeId, `1.0/networks/${net.name}/state`).catch(() => null),
        net.managed
          ? incus<DHCPLease[]>(nodeId, `1.0/networks/${net.name}/leases`).catch(() => [] as DHCPLease[])
          : Promise.resolve([] as DHCPLease[]),
      ])
      return { state, leases: leases ?? [] }
    },
  })
  const state = detailQuery.data?.state ?? null
  const leases = detailQuery.data?.leases ?? []

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
          {isActive && <Badge variant="default" className="gap-1"><Check className="size-3" />当前使用</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{net.used_by?.length ?? 0} 个引用</span>
          {showSetupButton ? (
            <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
              <Settings className="size-3.5 mr-1.5" />
              {buttonLabel}
            </Button>
          ) : (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800">
              <Check className="size-3" />
              已配置
            </Badge>
          )}
        </div>
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

      <SetupNetworkDialog
        nodeId={nodeId}
        networkName={net.name}
        interfaces={interfaces}
        open={setupOpen}
        onOpenChange={setSetupOpen}
      />
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

export default function NodeNetworkTable({ nodeId, activeNetworkName }: Props) {
  const query = useQuery({
    queryKey: queryKeys.nodeNetworks(nodeId),
    queryFn: async () => {
      const data = await incus<IncusNetworkDetail[]>(nodeId, "1.0/networks", { params: { recursion: "1" } })
      return data ?? []
    },
  })
  const networks = query.data ?? []

  const detectQuery = useQuery({
    queryKey: getAdminNodesByIdNetworksDetectQueryKey({ path: { id: nodeId } }),
    queryFn: async () => {
      const { data: res } = await getAdminNodesByIdNetworksDetect({ path: { id: nodeId } })
      return res?.data ?? { bridges: [], interfaces: [] }
    },
    retry: false,
  })
  const detectMap = new Map<string, ServiceDetectedNetwork>()
  for (const d of detectQuery.data?.bridges ?? []) {
    if (d.name) detectMap.set(d.name, d)
  }
  const physicalInterfaces = detectQuery.data?.interfaces ?? []

  useQueryErrorToast(query.error, "获取网络列表失败", incusErrorMessage)

  if (query.isPending) {
    return <NetworkTableSkeleton />
  }

  if (query.isError) {
    const errMsg = incusErrorMessage(query.error, "")
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
        <p className="text-sm text-destructive">获取网络列表失败</p>
        {errMsg && <p className="text-xs text-muted-foreground font-mono">{errMsg}</p>}
        <p className="text-xs text-muted-foreground">请检查节点是否已完成初始化且服务端口可达</p>
      </div>
    )
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
          <NetworkSection
            net={net}
            nodeId={nodeId}
            activeNetworkName={activeNetworkName}
            detectInfo={detectMap.get(net.name)}
            interfaces={physicalInterfaces}
          />
        </div>
      ))}
    </div>
  )
}
