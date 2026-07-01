"use no memo";
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  putAdminNodesById,
  postAdminNodesByIdInit,
  deleteAdminNodesById,
} from "@/api"
import type { NodeNodeItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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
import { useConfirm } from "@/hooks/use-confirm"
import { useAdminPath } from "@/hooks/use-site-settings"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

const editSchema = z.object({
  name: z.string().min(1, "请输入名称").max(128),
  region: z.string().max(64).optional().default(""),
  host: z.string().min(1, "请输入主机地址").max(255),
  port: z.coerce.number().int().min(1).max(65535).default(8443),
  ssh_port: z.coerce.number().int().min(1).max(65535).default(22),
  ssh_user: z.string().max(64).optional().default("root"),
  ssh_auth_method: z.enum(["password", "key"]).default("password"),
  ssh_password: z.string().max(256).optional().default(""),
  ssh_key: z.string().optional().default(""),
})

type FormValues = z.infer<typeof editSchema>

const fieldNames = [
  "name", "region", "host", "port", "ssh_port",
  "ssh_user", "ssh_auth_method", "ssh_password", "ssh_key",
]

interface NodeSettingsProps {
  node: NodeNodeItem
  onNodeChange: () => void
}

function toFormValues(node: NodeNodeItem): FormValues {
  return {
    name: node.name ?? "",
    region: node.region ?? "",
    host: node.host ?? "",
    port: node.port ?? 8443,
    ssh_port: node.ssh_port ?? 22,
    ssh_user: node.ssh_user ?? "root",
    ssh_auth_method: (node.ssh_auth_method as "password" | "key") ?? "password",
    ssh_password: "",
    ssh_key: "",
  }
}

export default function NodeSettings({ node, onNodeChange }: NodeSettingsProps) {
  const navigate = useNavigate()
  const adminPath = useAdminPath()
  const { confirm, ConfirmDialog } = useConfirm()
  const [serverError, setServerError] = useState("")

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
    defaultValues: toFormValues(node),
  })

  useEffect(() => {
    form.reset(toFormValues(node))
  }, [node, form])

  const authMethod = form.watch("ssh_auth_method")

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const body = {
        name: values.name,
        region: values.region || undefined,
        host: values.host,
        port: values.port,
        ssh_port: values.ssh_port,
        ssh_user: values.ssh_user || undefined,
        ssh_auth_method: values.ssh_auth_method,
        ssh_password: values.ssh_auth_method === "password" ? (values.ssh_password || undefined) : undefined,
        ssh_key: values.ssh_auth_method === "key" ? (values.ssh_key || undefined) : undefined,
      }
      const { data: res } = await putAdminNodesById({ path: { id: node.id! }, body })
      if (res?.code !== 0) {
        handleServerErrors<FormValues>(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      toast.success("节点信息已更新")
      onNodeChange()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  const handleReinit = async () => {
    const ok = await confirm({
      title: "重新初始化节点",
      description: (
        <>
          <p>系统将通过 SSH 重新执行完整的初始化流程，包括安装运行环境、虚拟机组件、配置远程 API 和重新生成 TLS 证书。</p>
          <p className="mt-2">正在运行的实例不会受到影响，但初始化期间节点将暂时不可用。确定要继续吗？</p>
        </>
      ),
      confirmText: "重新初始化",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await postAdminNodesByIdInit({ path: { id: node.id! } })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "初始化失败")
        return
      }
      toast.success("初始化任务已提交")
      onNodeChange()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: "删除节点",
      description: `确定要删除节点「${node.name}」吗？此操作不可撤销。如果节点上有实例，需要先删除所有实例。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminNodesById({ path: { id: node.id! } })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "删除失败")
        return
      }
      toast.success("节点已删除")
      navigate(`${adminPath}/nodes`, { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          {/* Basic info */}
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">基本信息</h3>
              <p className="text-sm text-muted-foreground mt-1">节点名称和区域标识</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 max-w-2xl">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel required>节点名称</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem>
                  <FormLabel>区域</FormLabel>
                  <FormControl><Input placeholder="hk" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator className="my-8" />

          {/* Connection */}
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">连接配置</h3>
              <p className="text-sm text-muted-foreground mt-1">主机地址和端口</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 max-w-2xl">
              <FormField control={form.control} name="host" render={({ field }) => (
                <FormItem>
                  <FormLabel required>主机地址</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="port" render={({ field }) => (
                <FormItem>
                  <FormLabel>服务端口</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ssh_port" render={({ field }) => (
                <FormItem>
                  <FormLabel>SSH 端口</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </section>

          <Separator className="my-8" />

          {/* SSH auth */}
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">SSH 认证</h3>
              <p className="text-sm text-muted-foreground mt-1">用于初始化和管理节点的 SSH 凭证</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 max-w-2xl">
              <FormField control={form.control} name="ssh_user" render={({ field }) => (
                <FormItem>
                  <FormLabel>SSH 用户</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ssh_auth_method" render={({ field }) => (
                <FormItem>
                  <FormLabel>认证方式</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="password">密码</SelectItem>
                      <SelectItem value="key">私钥</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="max-w-2xl">
              {authMethod === "password" && (
                <FormField control={form.control} name="ssh_password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSH 密码 <span className="text-muted-foreground font-normal">（留空则不修改）</span></FormLabel>
                    <FormControl><Input type="password" placeholder="不修改请留空" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              {authMethod === "key" && (
                <FormField control={form.control} name="ssh_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSH 私钥 <span className="text-muted-foreground font-normal">（留空则不修改）</span></FormLabel>
                    <FormControl><Textarea rows={4} placeholder="不修改请留空" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </section>
        </form>
      </Form>

      <Separator className="my-8" />

      {/* Danger zone */}
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-destructive">危险操作</h3>
          <p className="text-sm text-muted-foreground mt-1">以下操作可能影响节点上的服务</p>
        </div>

        <div className="space-y-0 rounded-md border border-destructive/30 divide-y divide-destructive/20">
          <div className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-medium">重新初始化</div>
              <div className="text-sm text-muted-foreground">通过 SSH 重新安装和配置运行环境</div>
            </div>
            <Button variant="outline" onClick={handleReinit}>重新初始化</Button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-medium">删除节点</div>
              <div className="text-sm text-muted-foreground">永久删除该节点及其所有配置，此操作不可撤销</div>
            </div>
            <Button variant="destructive" onClick={handleDelete}>删除节点</Button>
          </div>
        </div>
      </section>

      {ConfirmDialog}
    </>
  )
}
