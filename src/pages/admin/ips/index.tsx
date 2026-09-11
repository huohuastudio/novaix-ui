import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, Zap, Loader2, Import, Globe, Check, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getAdminIpPools,
  postAdminIpPools,
  putAdminIpPoolsById,
  putAdminIpsById,
  deleteAdminIpPoolsById,
  deleteAdminIpsById,
  deleteAdminIpPoolsByIdFreeIps,
  postAdminIpPoolsByIdGenerate,
  getAdminNodes,
} from "@/api"
import type { IppoolIpPoolItem, IppoolIpItem, IncusIPv6ConfigResult } from "@/api"
import { getAdminIpPoolsQueryKey, getAdminIpsOptions } from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { invalidateGeneratedQueries } from "@/lib/query-keys"
import { incus } from "@/lib/incus"
import { PaginatedSelect } from "@/components/paginated-select"
import type { IncusNetworkDetail } from "@/types/incus"

// ── Schema ──

const poolSchema = z.object({
  name: z.string().min(1, "请输入名称").max(128),
  description: z.string().max(512).default(""),
  type: z.enum(["ipv4", "ipv6"]),
  gateway: z.string().min(1, "请输入网关"),
  cidr: z.string().min(1, "请输入 CIDR"),
  dns1: z.string().default("8.8.8.8"),
  dns2: z.string().default("8.8.4.4"),
  vlan: z.coerce.number<number | string>().int().min(0).default(0),
  network_name: z.string().default(""),
  node_id: z.coerce.number().int().positive().nullable().default(null),
})

type PoolFormInput = z.input<typeof poolSchema>
type PoolFormValues = z.output<typeof poolSchema>

const poolDefaults: PoolFormValues = {
  name: "",
  description: "",
  type: "ipv4",
  gateway: "",
  cidr: "",
  dns1: "8.8.8.8",
  dns2: "8.8.4.4",
  vlan: 0,
  network_name: "",
  node_id: null,
}

const generateSchema = z.object({
  start_ip: z.string().min(1, "请输入起始 IP"),
  end_ip: z.string().min(1, "请输入结束 IP"),
})

type GenerateFormValues = z.infer<typeof generateSchema>

// ── 从节点导入网桥配置 ──

const fetchNodeOptions = async (page: number, keyword: string) => {
  const { data: res } = await getAdminNodes({ query: { page, page_size: 20, status: 1, ...(keyword ? { keyword } : {}) } })
  const nodes = res?.data?.items ?? []
  const total = res?.data?.total ?? 0
  return {
    items: nodes.map(n => ({ id: String(n.id), label: n.name ?? `节点 ${n.id}` })),
    hasMore: page * 20 < total,
  }
}

function useNodeNetworks() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")
  const [networks, setNetworks] = useState<IncusNetworkDetail[]>([])
  const [loadingNetworks, setLoadingNetworks] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<string>("")

  const selectNode = async (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setSelectedNetwork("")
    if (!nodeId) {
      setNetworks([])
      return
    }
    setLoadingNetworks(true)
    try {
      const nets = await incus<IncusNetworkDetail[]>(Number(nodeId), "1.0/networks", { params: { recursion: "1" } })
      setNetworks((nets ?? []).filter(n => n.managed))
    } catch {
      setNetworks([])
      toast.error("获取节点网桥列表失败")
    } finally {
      setLoadingNetworks(false)
    }
  }

  const reset = () => {
    setSelectedNodeId("")
    setSelectedNetwork("")
    setNetworks([])
  }

  return { selectedNodeId, selectNode, networks, loadingNetworks, selectedNetwork, setSelectedNetwork, reset }
}

// ── Shared form fields ──

function PoolFormFields({ form, typeDisabled }: { form: UseFormReturn<PoolFormInput, unknown, PoolFormValues>; typeDisabled?: boolean }) {
  const nodeHelper = useNodeNetworks()
  const poolType = useWatch({ control: form.control, name: "type" })
  const isIPv6 = poolType === "ipv6"
  const ph = isIPv6
    ? { name: "公网 IPv6", cidr: "2001:db8::/64", gw: "2001:db8::1", dns1: "2606:4700:4700::1111", dns2: "2606:4700:4700::1001" }
    : { name: "公网 IPv4", cidr: "192.168.1.0/24", gw: "192.168.1.1", dns1: "8.8.8.8", dns2: "8.8.4.4" }

  const handleSelectNetwork = (networkName: string) => {
    nodeHelper.setSelectedNetwork(networkName)
    const net = nodeHelper.networks.find(n => n.name === networkName)
    if (!net) return
    form.setValue("network_name", net.name)
    if (isIPv6) {
      const ipv6Addr = net.config?.["ipv6.address"]
      if (ipv6Addr && ipv6Addr !== "none" && ipv6Addr !== "auto") {
        const [gateway, prefix] = ipv6Addr.split("/")
        form.setValue("gateway", gateway ?? "")
        if (gateway && prefix) {
          form.setValue("cidr", `${gateway.replace(/:?[^:]+$/, "::")}/${prefix}`)
        }
      }
    } else {
      const ipv4Addr = net.config?.["ipv4.address"]
      if (ipv4Addr && ipv4Addr !== "none" && ipv4Addr !== "auto") {
        const [gateway] = ipv4Addr.split("/")
        form.setValue("gateway", gateway ?? "")
        const prefix = ipv4Addr.split("/")[1]
        if (gateway && prefix) {
          const parts = gateway.split(".").map(Number)
          const mask = ~((1 << (32 - Number(prefix))) - 1) >>> 0
          const netAddr = [(parts[0] & (mask >>> 24)), (parts[1] & ((mask >>> 16) & 255)), (parts[2] & ((mask >>> 8) & 255)), (parts[3] & (mask & 255))]
          form.setValue("cidr", `${netAddr.join(".")}/${prefix}`)
        }
      }
    }
    form.setValue("node_id", Number(nodeHelper.selectedNodeId))
    toast.success(`已填充网桥「${net.name}」的配置并绑定节点`)
  }

  return (
    <>
      {/* 从节点导入网桥配置 */}
      {!typeDisabled && (
        <div className="rounded-md border border-dashed p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Import className="size-4" />
            <span>从节点导入</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PaginatedSelect
              value={nodeHelper.selectedNodeId}
              onChange={nodeHelper.selectNode}
              fetchFn={fetchNodeOptions}
              placeholder="选择节点"
              searchPlaceholder="搜索节点..."
              emptyText="无匹配节点"
            />
            <Select
              value={nodeHelper.selectedNetwork}
              onValueChange={handleSelectNetwork}
              disabled={!nodeHelper.selectedNodeId || nodeHelper.loadingNetworks}
            >
              <SelectTrigger>
                {nodeHelper.loadingNetworks ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />加载中...</span>
                ) : (
                  <SelectValue placeholder="选择网桥..." />
                )}
              </SelectTrigger>
              <SelectContent>
                {nodeHelper.networks.map(n => (
                  <SelectItem key={n.name} value={n.name}>
                    {n.name}
                    {(() => {
                      const addr = isIPv6 ? n.config?.["ipv6.address"] : n.config?.["ipv4.address"]
                      return addr && addr !== "none" && addr !== "auto" ? (
                        <span className="ml-1.5 text-muted-foreground">({addr})</span>
                      ) : null
                    })()}
                  </SelectItem>
                ))}
                {!nodeHelper.loadingNetworks && nodeHelper.selectedNodeId && nodeHelper.networks.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">无可用网桥</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>名称</FormLabel>
              <FormControl><Input placeholder={ph.name} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>类型</FormLabel>
              <Select onValueChange={(v) => {
                field.onChange(v)
                if (v === "ipv6") {
                  form.setValue("dns1", "2606:4700:4700::1111")
                  form.setValue("dns2", "2606:4700:4700::1001")
                } else {
                  form.setValue("dns1", "8.8.8.8")
                  form.setValue("dns2", "8.8.4.4")
                }
              }} value={field.value} disabled={typeDisabled}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ipv4">IPv4</SelectItem>
                  <SelectItem value="ipv6">IPv6</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>描述</FormLabel>
            <FormControl><Input placeholder="如：香港BGP线路（可选）" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cidr"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1.5">
                <FormLabel required>CIDR</FormLabel>
                <HelpLink path="/novaix/ip-pool" />
              </div>
              <FormControl><Input placeholder={ph.cidr} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gateway"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>网关</FormLabel>
              <FormControl><Input placeholder={ph.gw} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="dns1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS 1</FormLabel>
              <FormControl><Input placeholder={ph.dns1} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dns2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS 2</FormLabel>
              <FormControl><Input placeholder={ph.dns2} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="vlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VLAN ID</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="network_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网桥名称</FormLabel>
              <FormControl><Input placeholder="br0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="node_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>绑定节点</FormLabel>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <PaginatedSelect
                  value={field.value ? String(field.value) : ""}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  fetchFn={fetchNodeOptions}
                  placeholder="待确认（需绑定后才可使用）"
                  searchPlaceholder="搜索节点..."
                  emptyText="无匹配节点"
                />
              </div>
              {field.value != null && (
                <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)}>
                  清除
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              绑定后此池对该节点可用并自动配置网桥。不绑定时池处于待确认状态，不可自动分配
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

// ── Pool Create Dialog ──

function PoolCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const form = useForm<PoolFormInput, unknown, PoolFormValues>({
    resolver: zodResolver(poolSchema),
    defaultValues: poolDefaults,
  })

  useEffect(() => {
    if (open) form.reset(poolDefaults)
  }, [open, form])

  const onSubmit = async (values: PoolFormValues) => {
    try {
      const { data: res } = await postAdminIpPools({ body: { ...values, node_id: values.node_id ?? undefined } })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "创建失败")
        return
      }
      // IPv6 池创建后显示节点网桥配置结果
      const configResults = (res?.data as Record<string, unknown>)?.ipv6_config_results as IncusIPv6ConfigResult[] | undefined
      if (configResults && configResults.length > 0) {
        const failed = configResults.filter(r => r.status === "failed")
        const skipped = configResults.filter(r => r.status === "skipped")
        const formatResult = (r: IncusIPv6ConfigResult) => r.node_name ? `${r.node_name}（${r.message}）` : (r.message ?? "")
        if (failed.length > 0) {
          toast.warning(`IP 池已创建，但以下节点 IPv6 配置失败：${failed.map(formatResult).join("、")}`)
        } else if (skipped.length > 0) {
          toast.info(`IP 池已创建。${skipped.map(r => r.message ?? "").join("；")}`)
        } else {
          toast.success("IP 池已创建，节点网桥 IPv6 已自动配置")
        }
      } else {
        toast.success("IP 池已创建")
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" preventClose>
        <DialogHeader>
          <DialogTitle>创建 IP 池</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PoolFormFields form={form} />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Pool Edit Dialog ──

function PoolEditDialog({
  open,
  onOpenChange,
  pool,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pool: IppoolIpPoolItem
  onSuccess: () => void
}) {
  const form = useForm<PoolFormInput, unknown, PoolFormValues>({
    resolver: zodResolver(poolSchema),
    defaultValues: poolDefaults,
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: pool.name ?? "",
        description: pool.description ?? "",
        type: (pool.type as "ipv4" | "ipv6") ?? "ipv4",
        gateway: pool.gateway ?? "",
        cidr: pool.cidr ?? "",
        dns1: pool.dns1 ?? "8.8.8.8",
        dns2: pool.dns2 ?? "8.8.4.4",
        vlan: pool.vlan ?? 0,
        network_name: pool.network_name ?? "",
        node_id: ((pool as Record<string, unknown>).node_id as number | null) ?? null,
      })
    }
  }, [open, pool, form])

  const onSubmit = async (values: PoolFormValues) => {
    try {
      const { data: res } = await putAdminIpPoolsById({
        path: { id: pool.id! },
        body: values,
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "更新失败")
        return
      }
      // IPv6 池绑定后显示网桥配置结果
      const configResults = (res?.data as Record<string, unknown>)?.ipv6_config_results as IncusIPv6ConfigResult[] | undefined
      if (configResults && configResults.length > 0) {
        const failed = configResults.filter(r => r.status === "failed")
        const skipped = configResults.filter(r => r.status === "skipped")
        const formatResult = (r: IncusIPv6ConfigResult) => r.node_name ? `${r.node_name}（${r.message}）` : (r.message ?? "")
        if (failed.length > 0) {
          toast.warning(`绑定已保存，但节点 IPv6 配置失败：${failed.map(formatResult).join("、")}。请在节点管理中重新同步`)
        } else if (skipped.length > 0) {
          toast.info(`绑定已保存。${skipped.map(r => r.message ?? "").join("；")}`)
        } else {
          toast.success("IP 池已更新，节点网桥 IPv6 已自动配置")
        }
      } else {
        toast.success("IP 池已更新")
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" preventClose>
        <DialogHeader>
          <DialogTitle>编辑 IP 池</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PoolFormFields form={form} typeDisabled />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── 根据 CIDR 和网关计算默认起止 IP ──

function computeDefaultIpRange(cidr: string, gateway: string): { start: string; end: string } {
  const [networkStr, prefixStr] = cidr.split("/")
  if (!networkStr || !prefixStr) return { start: "", end: "" }

  const prefix = parseInt(prefixStr)
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return { start: "", end: "" }

  const parts = networkStr.split(".").map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return { start: "", end: "" }

  const networkNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  const hostBits = 32 - prefix
  const totalHosts = (1 << hostBits) >>> 0

  // 解析网关地址
  const gatewayParts = gateway.split(".").map(Number)
  const gatewayNum = gatewayParts.length === 4
    ? ((gatewayParts[0] << 24) | (gatewayParts[1] << 16) | (gatewayParts[2] << 8) | gatewayParts[3]) >>> 0
    : networkNum + 1

  // 起始：取 网络地址+100 和 网关+1 中较大的
  const startNum = Math.max(networkNum + 100, gatewayNum + 1)
  // 结束：起始+100 和 广播地址-1 中较小的
  const broadcastNum = networkNum + totalHosts - 1
  const endNum = Math.min(startNum + 100, broadcastNum - 1)

  if (startNum >= broadcastNum) return { start: "", end: "" }

  const numToIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`

  return { start: numToIp(startNum), end: numToIp(endNum) }
}

// ── Generate IPs Dialog ──

function GenerateIPsDialog({
  open,
  onOpenChange,
  pool,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pool: IppoolIpPoolItem
  onSuccess: () => void
}) {
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: { start_ip: "", end_ip: "" },
  })

  useEffect(() => {
    if (open) {
      const defaults = computeDefaultIpRange(pool.cidr ?? "", pool.gateway ?? "")
      form.reset({ start_ip: defaults.start, end_ip: defaults.end })
    }
  }, [open, form, pool.cidr, pool.gateway])

  const onSubmit = async (values: GenerateFormValues) => {
    try {
      const { data: res } = await postAdminIpPoolsByIdGenerate({
        path: { id: pool.id! },
        body: values,
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "生成失败")
        return
      }
      const created = (res.data as Record<string, unknown>)?.created as number ?? 0
      toast.success(`成功生成 ${created} 个 IP`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" preventClose>
        <DialogHeader>
          <DialogTitle>批量生成 IP</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="start_ip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>起始 IP</FormLabel>
                  <FormControl><Input placeholder="192.168.1.10" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_ip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>结束 IP</FormLabel>
                  <FormControl><Input placeholder="192.168.1.100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "生成中..." : "生成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── IP 列表展开行 ──

const ipStatusLabels: Record<number, { label: string; variant: "secondary" | "default" | "outline" }> = {
  0: { label: "空闲", variant: "secondary" },
  1: { label: "已分配", variant: "default" },
  2: { label: "保留", variant: "outline" },
}

function PoolIPsExpanded({ pool }: { pool: IppoolIpPoolItem }) {
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog: IpConfirmDialog } = useConfirm()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingFree, setDeletingFree] = useState(false)
  const [addIpValue, setAddIpValue] = useState("")
  const [addingIp, setAddingIp] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const statusParam = statusFilter === "all" ? undefined : Number(statusFilter) as 0 | 1 | 2
  const ipsQueryOpts = { query: { pool_id: pool.id!, page, page_size: 20, ...(statusParam != null ? { status: statusParam } : {}) } }

  const { data, isLoading, error: queryError, refetch } = useQuery({
    ...getAdminIpsOptions(ipsQueryOpts),
    select: (res) => {
      const d = res?.data as Record<string, unknown> | undefined
      return {
        items: (d?.items ?? []) as IppoolIpItem[],
        total: (d?.total as number) ?? 0,
      }
    },
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const addSingleIp = async () => {
    const addr = addIpValue.trim()
    if (!addr) return
    setAddingIp(true)
    try {
      const { data: res } = await postAdminIpPoolsByIdGenerate({
        path: { id: pool.id! },
        body: { start_ip: addr, end_ip: addr },
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "添加失败")
        return
      }
      const created = (res.data as Record<string, unknown>)?.created as number ?? 0
      if (created === 0) {
        toast.warning("该 IP 已存在")
      } else {
        toast.success(`IP ${addr} 已添加`)
        setAddIpValue("")
      }
      invalidateIps()
    } catch (err) {
      toast.error(getErrorMessage(err, "添加失败"))
    } finally {
      setAddingIp(false)
    }
  }

  const toggleStatus = async (ip: IppoolIpItem) => {
    const newStatus = ip.status === 0 ? 2 : 0
    setTogglingId(ip.id!)
    try {
      const { data: res } = await putAdminIpsById({ path: { id: ip.id! }, body: { status: newStatus } })
      if (res?.code === 0) {
        toast.success(newStatus === 2 ? "已标记为保留" : "已标记为空闲")
        if (statusFilter !== "all" && items.length <= 1 && page > 1) setPage(p => p - 1)
        invalidateIps()
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setTogglingId(null)
    }
  }

  const invalidateIps = () => {
    invalidateAllIps(queryClient)
    queryClient.invalidateQueries({ queryKey: getAdminIpPoolsQueryKey() })
  }

  const saveNote = async (ipId: number) => {
    setSavingNote(true)
    try {
      const { data: res } = await putAdminIpsById({ path: { id: ipId }, body: { note: editNote } })
      if (res?.code === 0) {
        toast.success("备注已保存")
        setEditingId(null)
        invalidateIps()
      } else {
        toast.error(res?.message ?? "保存失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "保存失败"))
    } finally {
      setSavingNote(false)
    }
  }

  const deleteIp = async (ip: IppoolIpItem) => {
    const ok = await confirm({
      title: "删除 IP",
      description: `确定要删除 IP「${ip.address}」吗？此操作不可恢复。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    setDeletingId(ip.id!)
    try {
      const { data: res } = await deleteAdminIpsById({ path: { id: ip.id! } })
      if (res?.code === 0) {
        toast.success(`IP ${ip.address} 已删除`)
        if (items.length <= 1 && page > 1) setPage(p => p - 1)
        invalidateIps()
      } else {
        toast.error(res?.message ?? "删除失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    } finally {
      setDeletingId(null)
    }
  }

  const deleteFreeIps = async () => {
    const ok = await confirm({
      title: "删除所有空闲 IP",
      description: `确定要删除 IP 池「${pool.name}」中所有空闲 IP 吗？此操作不可恢复。`,
      confirmText: "全部删除",
      destructive: true,
    })
    if (!ok) return
    setDeletingFree(true)
    try {
      const { data: res } = await deleteAdminIpPoolsByIdFreeIps({ path: { id: pool.id! } })
      if (res?.code === 0) {
        const count = (res.data as Record<string, unknown>)?.deleted as number ?? 0
        toast.success(`已删除 ${count} 个空闲 IP`)
        setPage(1)
        invalidateIps()
      } else {
        toast.error(res?.message ?? "删除失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    } finally {
      setDeletingFree(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="0">空闲</SelectItem>
              <SelectItem value="1">已分配</SelectItem>
              <SelectItem value="2">保留</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{total} 条</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              value={addIpValue}
              onChange={(e) => setAddIpValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSingleIp() }}
              className="h-8 w-36 text-xs"
              placeholder="输入 IP 地址"
              disabled={addingIp}
            />
            <Button size="sm" className="text-xs" disabled={addingIp || !addIpValue.trim()} onClick={addSingleIp}>
              {addingIp ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
              添加
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-destructive hover:text-destructive"
            disabled={deletingFree}
            onClick={deleteFreeIps}
          >
            {deletingFree ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            删除所有空闲
          </Button>
        </div>
      </div>

      {queryError ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-sm text-destructive">加载失败：{getErrorMessage(queryError, "请稍后重试")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>重试</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">暂无 IP</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">地址</th>
                <th className="px-3 py-2 text-left font-medium">状态</th>
                <th className="px-3 py-2 text-left font-medium">实例 ID</th>
                <th className="px-3 py-2 text-left font-medium">主 IP</th>
                <th className="px-3 py-2 text-left font-medium">备注</th>
                <th className="px-3 py-2 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ip) => {
                const st = ipStatusLabels[ip.status ?? 0] ?? ipStatusLabels[0]
                const isEditing = editingId === ip.id
                return (
                  <tr key={ip.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums">{ip.id}</td>
                    <td className="px-3 py-2 font-mono">{ip.address}</td>
                    <td className="px-3 py-2">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{ip.instance_id || "-"}</td>
                    <td className="px-3 py-2">{ip.is_primary ? "是" : "-"}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNote(ip.id!)
                              if (e.key === "Escape") setEditingId(null)
                            }}
                            className="h-7 text-xs w-40"
                            maxLength={256}
                            disabled={savingNote}
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="size-6" onClick={() => saveNote(ip.id!)} disabled={savingNote}>
                            <Check className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-6" onClick={() => setEditingId(null)}>
                            <X className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span className="truncate max-w-[160px]" title={ip.note}>{ip.note || "-"}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => { setEditNote(ip.note ?? ""); setEditingId(ip.id!) }}
                          >
                            <Pencil className="size-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        {ip.status !== 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={togglingId === ip.id}
                                onClick={() => toggleStatus(ip)}
                              >
                                {togglingId === ip.id ? <Loader2 className="size-3 animate-spin" /> : null}
                                {ip.status === 0 ? "保留" : "释放"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{ip.status === 0 ? "标记为保留，阻止自动分配" : "标记为空闲，允许自动分配"}</TooltipContent>
                          </Tooltip>
                        )}
                        {ip.status !== 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            disabled={deletingId === ip.id}
                            onClick={() => deleteIp(ip)}
                          >
                            {deletingId === ip.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            上一页
          </Button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            下一页
          </Button>
        </div>
      )}
      {IpConfirmDialog}
    </div>
  )
}

// ── Main page ──

function invalidateAllIps(qc: ReturnType<typeof useQueryClient>) {
  invalidateGeneratedQueries(qc, "getAdminIps")
}

export default function IPs() {
  useBreadcrumb([{ label: "IP 池管理" }])
  const formatDate = useFormatDate()
  const mainQueryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingPool, setEditingPool] = useState<IppoolIpPoolItem | null>(null)
  const [generatePool, setGeneratePool] = useState<IppoolIpPoolItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchPools = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "name" | "type" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminIpPools({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        sort,
        order,
      },
    })

    const data = res?.data as Record<string, unknown> | undefined
    return {
      items: (data?.items ?? []) as IppoolIpPoolItem[],
      total: (data?.total as number) ?? 0,
      page: (data?.page as number) ?? 1,
      page_size: (data?.page_size as number) ?? pageSize,
    }
  }, [])

  const table = useDataTable<IppoolIpPoolItem>({
    fetchFn: fetchPools,
    queryKey: getAdminIpPoolsQueryKey(),
    filterKeys: ["name"],
  })

  const handleEdit = useCallback((pool: IppoolIpPoolItem) => {
    setEditingPool(pool)
  }, [])

  const handleDelete = useCallback(async (pool: IppoolIpPoolItem) => {
    const ok = await confirm({
      title: "删除 IP 池",
      description: `确定要删除 IP 池「${pool.name}」吗？池中所有空闲 IP 将一并删除。如果有已分配的 IP，则无法删除。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminIpPoolsById({ path: { id: pool.id! } })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "删除失败")
        return
      }
      toast.success("IP 池已删除")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }, [confirm, table])

  const columns: ColumnDef<IppoolIpPoolItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "名称",
      enableSorting: true,
      meta: {
        filterVariant: "text" as const,
        filterPlaceholder: "搜索名称/CIDR...",
      },
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      enableSorting: true,
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.type?.toUpperCase()}</Badge>
      ),
    },
    {
      accessorKey: "cidr",
      header: "CIDR",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.cidr}</span>
      ),
    },
    {
      accessorKey: "gateway",
      header: "网关",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.gateway}</span>
      ),
    },
    {
      id: "node",
      header: "绑定节点",
      cell: ({ row }) => {
        const nodeId = (row.original as Record<string, unknown>).node_id as number | undefined
        const nodeName = (row.original as Record<string, unknown>).node_name as string | undefined
        if (!nodeId) {
          return <Badge variant="outline" className="text-muted-foreground">待确认</Badge>
        }
        return <Badge variant="secondary">{nodeName || `节点 ${nodeId}`}</Badge>
      },
    },
    {
      id: "usage",
      header: "IP 使用",
      cell: ({ row }) => {
        const pool = row.original
        const total = pool.total_ips ?? 0
        const used = pool.used_ips ?? 0
        const free = pool.free_ips ?? 0
        return (
          <div className="text-sm">
            <span className="text-primary font-medium">{used}</span>
            <span className="text-muted-foreground"> / {total}</span>
            <span className="text-muted-foreground text-xs ml-1">
              ({free} 空闲)
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const pool = row.original
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setGeneratePool(pool)}
                >
                  <Zap className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>批量生成 IP</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => handleEdit(pool)}
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(pool)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete, formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">IP 池管理</h1>
          <HelpLink path="/novaix/ip-pool" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理 IPv4/IPv6 地址池</p>
      </div>

      <DataTable
        tourId="ip-table"
        columns={columns}
        data={table.data}
        loading={table.loading}
        fetching={table.fetching}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        getRowId={(row) => String(row.id)}
        renderExpanded={(row) => <PoolIPsExpanded pool={row} />}
        emptyIcon={Globe}
        emptyTitle="暂无 IP 池"
        emptyDescription="创建 IP 池并添加 IP 地址"
        emptyAction={<Button variant="outline" onClick={() => setCreateOpen(true)}>创建 IP 池</Button>}
        toolbar={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            创建 IP 池
          </Button>
        }
      />

      <PoolCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={table.refresh}
      />

      {editingPool && (
        <PoolEditDialog
          open={!!editingPool}
          onOpenChange={(open) => { if (!open) setEditingPool(null) }}
          pool={editingPool}
          onSuccess={table.refresh}
        />
      )}

      {generatePool && (
        <GenerateIPsDialog
          open={!!generatePool}
          onOpenChange={(open) => { if (!open) setGeneratePool(null) }}
          pool={generatePool}
          onSuccess={() => {
            setGeneratePool(null)
            table.refresh()
            invalidateAllIps(mainQueryClient)
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  )
}
