import { useEffect, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminNodes, putAdminNodesById, postAdminNodesTestConnection, postAdminNodesByIdTestConnection, postAdminNodesCheckPort, getAdminRegionsAll } from "@/api"
import type { NodeNodeItem, ServiceTestConnectionResponse, RegionRegionItem } from "@/api"
import { useQuery } from "@tanstack/react-query"
import { getAdminRegionsAllQueryKey } from "@/api/@tanstack/react-query.gen"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { HelpLink } from "@/components/help-doc"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, XCircle, Info, CircleDot } from "lucide-react"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// ── Schema ──

const baseFields = {
  name: z.string().min(1, "请输入名称").max(128, "名称不能超过 128 个字符"),
  region_id: z.coerce.number<number | string>().int().optional(),
  host: z.string().min(1, "请输入主机地址").max(255, "主机地址不能超过 255 个字符"),
  port: z.coerce.number<number | string>().int().min(1, "端口范围 1-65535").max(65535, "端口范围 1-65535").optional().default(8443),
  ssh_port: z.coerce.number<number | string>().int().min(1, "端口范围 1-65535").max(65535, "端口范围 1-65535").optional().default(22),
  ssh_user: z.string().max(64, "SSH 用户不能超过 64 个字符").optional().default("root"),
  ssh_auth_method: z.enum(["password", "key"]).default("password"),
  ssh_password: z.string().max(256).optional().default(""),
  ssh_key: z.string().optional().default(""),
  monitor_port: z.coerce.number<number | string>().int().min(1024, "端口范围 1024-65535").max(65535, "端口范围 1024-65535").optional().default(9100),
  cpu_overcommit: z.coerce.number<number | string>().min(0, "最小为 0%").max(9900, "最大为 9900%").optional().default(0),
  mem_overcommit: z.coerce.number<number | string>().min(0, "最小为 0%").max(9900, "最大为 9900%").optional().default(0),
  disk_overcommit: z.coerce.number<number | string>().min(0, "最小为 0%").max(9900, "最大为 9900%").optional().default(0),
  mem_ballooning_mode: z.boolean().optional().default(false),
}

const createSchema = z.object(baseFields).superRefine((data, ctx) => {
  if (data.ssh_auth_method === "password" && !data.ssh_password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "请输入 SSH 密码", path: ["ssh_password"] })
  }
  if (data.ssh_auth_method === "key" && !data.ssh_key) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "请输入 SSH 私钥", path: ["ssh_key"] })
  }
})

const editSchema = z.object({
  ...baseFields,
  cluster_member_name: z.string().max(128).optional().default(""),
  network_name: z.string().max(64).optional().default(""),
  storage_pool: z.string().max(64).optional().default(""),
})

type NodeFormInput = z.input<typeof createSchema>
type NodeFormValues = z.output<typeof createSchema>
type EditFormInput = z.input<typeof editSchema>
type EditFormValues = z.output<typeof editSchema>

const defaultValues: EditFormValues = {
  name: "",
  region_id: undefined,
  host: "",
  port: 8443,
  ssh_port: 22,
  ssh_user: "root",
  ssh_auth_method: "password",
  ssh_password: "",
  ssh_key: "",
  cluster_member_name: "",
  network_name: "",
  storage_pool: "",
  monitor_port: 9100,
  cpu_overcommit: 0,
  mem_overcommit: 0,
  disk_overcommit: 0,
  mem_ballooning_mode: false,
}

const fieldNames = Object.keys(defaultValues)

// ── 共享表单字段 ──

function NameField({ form }: { form: UseFormReturn<NodeFormInput, unknown, NodeFormValues> }) {
  return (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel required>名称</FormLabel>
          <FormControl><Input placeholder="hk-node-01" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function RegionSelectField({ form, regions }: { form: UseFormReturn<NodeFormInput, unknown, NodeFormValues>; regions: RegionRegionItem[] }) {
  return (
    <FormField
      control={form.control}
      name="region_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>区域</FormLabel>
          <Select onValueChange={(v) => field.onChange(v ? Number(v) : undefined)} value={field.value ? String(field.value) : ""}>
            <FormControl>
              <SelectTrigger><SelectValue placeholder="选择区域" /></SelectTrigger>
            </FormControl>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.flag ? `${r.flag} ` : ""}{r.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function HostField({ form }: { form: UseFormReturn<NodeFormInput, unknown, NodeFormValues> }) {
  return (
    <FormField
      control={form.control}
      name="host"
      render={({ field }) => (
        <FormItem>
          <FormLabel required>主机地址</FormLabel>
          <FormControl><Input placeholder="192.168.1.100" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function PortCheckButton({ host, port }: { host: string; port: number }) {
  const [state, setState] = useState<{ status: "idle" | "checking" | "ok" | "fail"; host: string; port: number }>({ status: "idle", host: "", port: 0 })

  const valid = !!host && port >= 1 && port <= 65535
  const current = state.host === host && state.port === port ? state.status : "idle"

  const check = async () => {
    if (!valid) return
    setState({ status: "checking", host, port })
    try {
      const { data: res } = await postAdminNodesCheckPort({ body: { host, port } })
      setState({ status: res?.data?.success ? "ok" : "fail", host, port })
    } catch {
      setState({ status: "fail", host, port })
    }
  }

  const icons = { idle: CircleDot, checking: Loader2, ok: CheckCircle2, fail: XCircle }
  const colors = { idle: "text-muted-foreground", checking: "text-muted-foreground animate-spin", ok: "text-green-600 dark:text-green-400", fail: "text-destructive" }
  const Icon = icons[current]

  const tip = current === "ok" ? "端口可达，点击重新检测" : current === "fail" ? "端口不可达，点击重新检测" : "检测端口是否可达"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={check} disabled={!valid || current === "checking"} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
          <Icon className={`size-4 ${colors[current]}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{tip}</TooltipContent>
    </Tooltip>
  )
}

const PORT_HINT_FIREWALL = "需在防火墙和安全组放行"

function PortFields({ form }: { form: UseFormReturn<NodeFormInput, unknown, NodeFormValues> }) {
  const host = form.watch("host")

  const checkablePorts: { name: "port" | "ssh_port"; label: string; placeholder: string }[] = [
    { name: "port", label: "服务端口", placeholder: "8443" },
    { name: "ssh_port", label: "SSH 端口", placeholder: "22" },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {checkablePorts.map(({ name, label, placeholder }) => (
        <FormField
          key={name}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl><Input type="number" placeholder={placeholder} {...field} /></FormControl>
                <PortCheckButton host={host} port={Number(field.value)} />
              </div>
              <p className="text-xs text-muted-foreground">{PORT_HINT_FIREWALL}</p>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <FormField
        control={form.control}
        name="monitor_port"
        render={({ field }) => (
          <FormItem>
            <FormLabel>监控端口</FormLabel>
            <FormControl><Input type="number" placeholder="9100" {...field} /></FormControl>
            <p className="text-xs text-muted-foreground">仅本机访问，无需放行</p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function SSHAuthFields({ form, optional }: { form: UseFormReturn<NodeFormInput, unknown, NodeFormValues>; optional?: boolean }) {
  const authMethod = form.watch("ssh_auth_method")

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="ssh_user"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SSH 用户</FormLabel>
              <FormControl><Input placeholder="root" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ssh_auth_method"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1.5">
                <FormLabel>SSH 认证方式</FormLabel>
                <HelpLink path="/novaix/node" />
              </div>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="password">密码</SelectItem>
                  <SelectItem value="key">私钥</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {authMethod === "password" && (
        <FormField
          control={form.control}
          name="ssh_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                SSH 密码
                {optional && <span className="text-muted-foreground font-normal">（留空则不修改）</span>}
              </FormLabel>
              <FormControl><Input type="password" placeholder={optional ? "不修改请留空" : "输入密码"} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {authMethod === "key" && (
        <FormField
          control={form.control}
          name="ssh_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                SSH 私钥
                {optional && <span className="text-muted-foreground font-normal">（留空则不修改）</span>}
              </FormLabel>
              <FormControl>
                <Textarea rows={6} placeholder={optional ? "不修改请留空" : "-----BEGIN OPENSSH PRIVATE KEY-----"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}

function OvercommitFields({ form }: { form: UseFormReturn<NodeFormInput, unknown, NodeFormValues> }) {
  return (
    <>
      <Separator />
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium">资源超开</p>
        <HelpLink path="/novaix/node#overcommit" />
      </div>
      <p className="text-xs text-muted-foreground -mt-2">0% 表示不超开，100% 表示可多卖一倍。超开过高可能导致宿主机 OOM</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="cpu_overcommit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPU (%)</FormLabel>
              <FormControl><Input type="number" step="10" min="0" max="9900" placeholder="建议 100~700" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mem_overcommit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>内存 (%)</FormLabel>
              <FormControl><Input type="number" step="10" min="0" max="9900" placeholder="建议 0~100" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="disk_overcommit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>磁盘 (%)</FormLabel>
              <FormControl><Input type="number" step="10" min="0" max="9900" placeholder="建议 0~50" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="mem_ballooning_mode"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <FormLabel>动态内存</FormLabel>
                <HelpLink path="/novaix/node#dynamic-memory" />
              </div>
              <p className="text-xs text-muted-foreground">允许容器在宿主机空闲时使用超出限制的内存</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  )
}

// ── 连接测试结果展示 ──

function ConnectionTestResults({ result }: { result: ServiceTestConnectionResponse }) {
  const items = [
    { label: "SSH", data: result.ssh },
    ...(result.incus ? [{ label: "服务端", data: result.incus }] : []),
  ]

  return (
    <div className="flex items-center gap-4 min-w-0">
      {items.map(({ label, data }) => (
        <div key={label} className="flex items-center gap-1.5 text-sm min-w-0">
          {data?.success ? (
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle className="size-4 text-destructive shrink-0" />
          )}
          <span className="font-medium shrink-0">{label}</span>
          {data?.success ? (
            <span className="text-muted-foreground">{data.latency}ms</span>
          ) : (
            <span className="text-destructive text-xs truncate max-w-48">{data?.message}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 构建请求 body ──

function buildBody(values: NodeFormValues & Partial<Pick<EditFormValues, "cluster_member_name" | "network_name" | "storage_pool">>) {
  return {
    name: values.name,
    region_id: values.region_id || undefined,
    host: values.host,
    port: values.port,
    ssh_port: values.ssh_port,
    ssh_user: values.ssh_user || undefined,
    ssh_auth_method: values.ssh_auth_method,
    ssh_password: values.ssh_auth_method === "password" ? (values.ssh_password || undefined) : undefined,
    ssh_key: values.ssh_auth_method === "key" ? (values.ssh_key || undefined) : undefined,
    cluster_member_name: values.cluster_member_name ?? values.name,
    network_name: values.network_name || undefined,
    storage_pool: values.storage_pool || undefined,
    monitor_port: values.monitor_port,
    cpu_overcommit: 1 + values.cpu_overcommit / 100,
    mem_overcommit: 1 + values.mem_overcommit / 100,
    disk_overcommit: 1 + values.disk_overcommit / 100,
    mem_ballooning_mode: values.mem_ballooning_mode,
  }
}

// ── 创建表单 ──

function useRegions() {
  return useQuery({
    queryKey: getAdminRegionsAllQueryKey(),
    queryFn: async () => {
      const { data: res } = await getAdminRegionsAll()
      return (res?.data ?? []) as RegionRegionItem[]
    },
  })
}

function CreateNodeForm({ open, onOpenChange, onSuccess }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ServiceTestConnectionResponse | null>(null)
  const { data: regions = [] } = useRegions()

  const form = useForm<NodeFormInput, unknown, NodeFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      setServerError("")
      setTestResult(null)
      form.reset(defaultValues)
    }
  }, [open, form])

  const handleTestConnection = async () => {
    const values = form.getValues()
    if (!values.host) return
    setTesting(true)
    setTestResult(null)
    try {
      const { data: res } = await postAdminNodesTestConnection({
        body: {
          host: values.host,
          port: Number(values.port) || 8443,
          ssh_port: Number(values.ssh_port) || 22,
          ssh_user: values.ssh_user || "root",
          ssh_auth_method: values.ssh_auth_method,
          ssh_password: values.ssh_auth_method === "password" ? values.ssh_password : undefined,
          ssh_key: values.ssh_auth_method === "key" ? values.ssh_key : undefined,
        },
      })
      if (res?.code === 0 && res.data) {
        setTestResult(res.data)
      }
    } catch (err) {
      setTestResult({ ssh: { success: false, message: getErrorMessage(err, "请求失败") } })
    } finally {
      setTesting(false)
    }
  }

  const onSubmit = async (values: NodeFormValues) => {
    setServerError("")
    try {
      const { data: res } = await postAdminNodes({ body: buildBody(values) })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-[min(80vw,1100px)] flex flex-col overflow-hidden" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>添加节点</SheetTitle>
          <SheetDescription>添加一台宿主机，保存后点击初始化按钮进行环境配置</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <Alert className="mb-4">
            <Info className="size-4" />
            <AlertDescription>
              节点服务器需运行受支持的操作系统：Ubuntu 20.04+、Debian 11+、CentOS/RHEL/Rocky/Alma 9+、Fedora 38+，推荐 Ubuntu 24.04 LTS
            </AlertDescription>
          </Alert>
          <Form {...form}>
            <form id="create-node-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" data-tour="node-form">
              <div className="grid grid-cols-2 gap-4" data-tour="node-form-basic">
                <NameField form={form} />
                <RegionSelectField form={form} regions={regions} />
              </div>
              <div data-tour="node-form-host">
                <HostField form={form} />
              </div>
              <div data-tour="node-form-ports">
                <PortFields form={form} />
              </div>
              <div data-tour="node-form-ssh" className="flex flex-col gap-4">
                <SSHAuthFields form={form} />
              </div>
              <OvercommitFields form={form} />
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            </form>
          </Form>
        </div>
        <SheetFooter className="shrink-0 border-t px-4 py-3 flex-row items-center justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">{testResult && <ConnectionTestResults result={testResult} />}</div>
          <div className="flex items-center gap-3 shrink-0">
            <Button type="button" variant="outline" disabled={testing || !form.watch("host")} onClick={handleTestConnection}>
              {testing && <Loader2 className="size-4 animate-spin" />}
              测试连接
            </Button>
            <Button type="submit" form="create-node-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "提交中..." : "创建"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ── 编辑表单 ──

function EditNodeForm({ open, onOpenChange, node, onSuccess }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: NodeNodeItem
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ServiceTestConnectionResponse | null>(null)
  const { data: regions = [] } = useRegions()

  const form = useForm<EditFormInput, unknown, EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues,
  })

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const values = form.getValues()
      const { data: res } = await postAdminNodesByIdTestConnection({
        path: { id: node.id! },
        body: {
          host: values.host,
          port: Number(values.port) || 8443,
          ssh_port: Number(values.ssh_port) || 22,
          ssh_user: values.ssh_user || "root",
          ssh_auth_method: values.ssh_auth_method,
          ssh_password: values.ssh_auth_method === "password" ? (values.ssh_password || undefined) : undefined,
          ssh_key: values.ssh_auth_method === "key" ? (values.ssh_key || undefined) : undefined,
        },
      })
      if (res?.code === 0 && res.data) {
        setTestResult(res.data)
      }
    } catch (err) {
      setTestResult({ ssh: { success: false, message: getErrorMessage(err, "请求失败") } })
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      setTestResult(null)
      form.reset({
        name: node.name ?? "",
        region_id: node.region_id ?? undefined,
        host: node.host ?? "",
        port: node.port ?? 8443,
        ssh_port: node.ssh_port ?? 22,
        ssh_user: node.ssh_user ?? "root",
        ssh_auth_method: (node.ssh_auth_method as "password" | "key") ?? "password",
        ssh_password: "",
        ssh_key: "",
        cluster_member_name: node.cluster_member_name ?? "",
        network_name: node.network_name ?? "",
        storage_pool: node.storage_pool ?? "",
        monitor_port: node.monitor_port ?? 9100,
        cpu_overcommit: Math.round(((node.cpu_overcommit ?? 1) - 1) * 100),
        mem_overcommit: Math.round(((node.mem_overcommit ?? 1) - 1) * 100),
        disk_overcommit: Math.round(((node.disk_overcommit ?? 1) - 1) * 100),
        mem_ballooning_mode: node.mem_ballooning_mode ?? false,
      })
    }
  }, [open, node, form])

  const onSubmit = async (values: EditFormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminNodesById({ path: { id: node.id! }, body: buildBody(values) })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-[min(80vw,1100px)] flex flex-col overflow-hidden" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>编辑节点</SheetTitle>
          <SheetDescription>修改节点连接信息和资源配置</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <Form {...form}>
            <form id="edit-node-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <NameField form={form} />
                <RegionSelectField form={form} regions={regions} />
              </div>
              <HostField form={form} />
              <PortFields form={form} />
              <SSHAuthFields form={form} optional />
              {node.node_group_id && (
                <FormField
                  control={form.control}
                  name="cluster_member_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>集群成员名</FormLabel>
                      <FormControl><Input placeholder="留空使用节点名称" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="network_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>网络名称</FormLabel>
                      <FormControl><Input placeholder="如 incusbr0" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">初始化时自动检测，修改后需与 IP 池/共享 IP 的网桥名称一致</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storage_pool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>存储池</FormLabel>
                      <FormControl><Input placeholder="如 default" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <OvercommitFields form={form} />
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            </form>
          </Form>
        </div>
        <SheetFooter className="shrink-0 border-t px-4 py-3 flex-row items-center justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">{testResult && <ConnectionTestResults result={testResult} />}</div>
          <div className="flex items-center gap-3 shrink-0">
            <Button type="button" variant="outline" disabled={testing} onClick={handleTestConnection}>
              {testing && <Loader2 className="size-4 animate-spin" />}
              测试连接
            </Button>
            <Button type="submit" form="edit-node-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ── 入口 ──

interface NodeFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node?: NodeNodeItem
  onSuccess: () => void
}

export default function NodeFormSheet({ open, onOpenChange, node, onSuccess }: NodeFormSheetProps) {
  if (node) {
    return <EditNodeForm open={open} onOpenChange={onOpenChange} node={node} onSuccess={onSuccess} />
  }
  return <CreateNodeForm open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
}
