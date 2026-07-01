import { useEffect, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminNodes, putAdminNodesById, postAdminNodesTestConnection, postAdminNodesByIdTestConnection } from "@/api"
import type { NodeNodeItem, ServiceTestConnectionResponse } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { HelpLink } from "@/components/help-doc"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ── Schema ──

const baseFields = {
  name: z.string().min(1, "请输入名称").max(128, "名称不能超过 128 个字符"),
  region: z.string().max(64, "区域不能超过 64 个字符").optional().default(""),
  host: z.string().min(1, "请输入主机地址").max(255, "主机地址不能超过 255 个字符"),
  port: z.coerce.number().int().min(1, "端口范围 1-65535").max(65535, "端口范围 1-65535").optional().default(8443),
  ssh_port: z.coerce.number().int().min(1, "端口范围 1-65535").max(65535, "端口范围 1-65535").optional().default(22),
  ssh_user: z.string().max(64, "SSH 用户不能超过 64 个字符").optional().default("root"),
  ssh_auth_method: z.enum(["password", "key"]).default("password"),
  ssh_password: z.string().max(256).optional().default(""),
  ssh_key: z.string().optional().default(""),
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
})

type NodeFormValues = z.infer<typeof editSchema>

const defaultValues: NodeFormValues = {
  name: "",
  region: "",
  host: "",
  port: 8443,
  ssh_port: 22,
  ssh_user: "root",
  ssh_auth_method: "password",
  ssh_password: "",
  ssh_key: "",
  cluster_member_name: "",
}

const fieldNames = Object.keys(defaultValues)

// ── 共享表单字段 ──

function NameField({ form }: { form: UseFormReturn<NodeFormValues> }) {
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

function RegionField({ form }: { form: UseFormReturn<NodeFormValues> }) {
  return (
    <FormField
      control={form.control}
      name="region"
      render={({ field }) => (
        <FormItem>
          <FormLabel>区域</FormLabel>
          <FormControl><Input placeholder="hk" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function HostField({ form }: { form: UseFormReturn<NodeFormValues> }) {
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

function PortFields({ form }: { form: UseFormReturn<NodeFormValues> }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="port"
        render={({ field }) => (
          <FormItem>
            <FormLabel>服务端口</FormLabel>
            <FormControl><Input type="number" placeholder="8443" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ssh_port"
        render={({ field }) => (
          <FormItem>
            <FormLabel>SSH 端口</FormLabel>
            <FormControl><Input type="number" placeholder="22" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function SSHAuthFields({ form, optional }: { form: UseFormReturn<NodeFormValues>; optional?: boolean }) {
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

// ── 连接测试结果展示 ──

function ConnectionTestResults({ result }: { result: ServiceTestConnectionResponse }) {
  const items = [
    { label: "SSH", data: result.ssh },
    ...(result.incus ? [{ label: "服务端", data: result.incus }] : []),
  ]

  return (
    <div className="space-y-1.5">
      {items.map(({ label, data }) => (
        <div key={label} className="flex items-center gap-2 text-sm">
          {data?.success ? (
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle className="size-4 text-destructive shrink-0" />
          )}
          <span className="font-medium">{label}</span>
          {data?.success ? (
            <span className="text-muted-foreground">{data.latency}ms</span>
          ) : (
            <span className="text-destructive text-xs truncate">{data?.message}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 构建请求 body ──

function buildBody(values: NodeFormValues) {
  return {
    name: values.name,
    region: values.region || undefined,
    host: values.host,
    port: values.port,
    ssh_port: values.ssh_port,
    ssh_user: values.ssh_user || undefined,
    ssh_auth_method: values.ssh_auth_method,
    ssh_password: values.ssh_auth_method === "password" ? (values.ssh_password || undefined) : undefined,
    ssh_key: values.ssh_auth_method === "key" ? (values.ssh_key || undefined) : undefined,
    cluster_member_name: values.cluster_member_name || values.name,
  }
}

// ── 创建表单 ──

function CreateNodeForm({ open, onOpenChange, onSuccess }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ServiceTestConnectionResponse | null>(null)

  const form = useForm<NodeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSchema) as any,
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
        handleServerErrors<NodeFormValues>(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>添加节点</DialogTitle>
          <DialogDescription>添加一台宿主机，保存后点击初始化按钮进行环境配置</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" data-tour="node-form">
            <div className="grid grid-cols-2 gap-4" data-tour="node-form-basic">
              <NameField form={form} />
              <RegionField form={form} />
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
            {testResult && <ConnectionTestResults result={testResult} />}
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={testing || !form.watch("host")} onClick={handleTestConnection}>
                {testing && <Loader2 className="size-4 animate-spin" />}
                测试连接
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "提交中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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

  const form = useForm<NodeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
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
        region: node.region ?? "",
        host: node.host ?? "",
        port: node.port ?? 8443,
        ssh_port: node.ssh_port ?? 22,
        ssh_user: node.ssh_user ?? "root",
        ssh_auth_method: (node.ssh_auth_method as "password" | "key") ?? "password",
        ssh_password: "",
        ssh_key: "",
        cluster_member_name: node.cluster_member_name ?? "",
      })
    }
  }, [open, node, form])

  const onSubmit = async (values: NodeFormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminNodesById({ path: { id: node.id! }, body: buildBody(values) })
      if (res?.code !== 0) {
        handleServerErrors<NodeFormValues>(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>编辑节点</DialogTitle>
          <DialogDescription>修改节点连接信息</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <NameField form={form} />
              <RegionField form={form} />
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
            {testResult && <ConnectionTestResults result={testResult} />}
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={testing} onClick={handleTestConnection}>
                {testing && <Loader2 className="size-4 animate-spin" />}
                测试连接
              </Button>
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
