"use no memo";
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  postAdminNodeGroups,
  putAdminNodeGroupsById,
} from "@/api"
import type { NodeGroupNodeGroupItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormSheet } from "@/components/form-sheet"

const schema = z.object({
  name: z.string().min(1, "请输入名称").max(128),
  description: z.string().max(512).default(""),
  storage_backend: z.enum(["local", "ceph"]).default("local"),
  cluster_mode: z.boolean().default(false),
  ha_enabled: z.boolean().default(false),
  ovn_enabled: z.boolean().default(false),
  ovn_uplink: z.string().max(128).default(""),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  name: "",
  description: "",
  storage_backend: "local",
  cluster_mode: false,
  ha_enabled: false,
  ovn_enabled: false,
  ovn_uplink: "",
}

const fieldNames = Object.keys(defaultValues)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: NodeGroupNodeGroupItem
  onSuccess: () => void
}

export default function NodeGroupFormDialog({ open, onOpenChange, group, onSuccess }: Props) {
  const isEdit = !!group
  const [serverError, setServerError] = useState("")
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    setServerError("")
    if (group) {
      form.reset({
        name: group.name ?? "",
        description: group.description ?? "",
        storage_backend: (group.storage_backend as "local" | "ceph") ?? "local",
        cluster_mode: group.cluster_mode ?? false,
        ha_enabled: group.ha_enabled ?? false,
        ovn_enabled: group.ovn_enabled ?? false,
        ovn_uplink: group.ovn_uplink ?? "",
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, group, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = isEdit
        ? await putAdminNodeGroupsById({
            path: { id: group!.id! },
            body: values,
          })
        : await postAdminNodeGroups({ body: values })

      if (res?.code !== 0) {
        handleServerErrors<FormValues>(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "编辑节点组" : "创建节点组"}
      description={isEdit ? "修改节点组的基本信息" : "创建一个新的节点组用于管理节点"}
      footer={
        <Button form="node-group-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : isEdit ? "保存" : "创建"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="node-group-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>名称</FormLabel>
                <FormControl>
                  <Input placeholder="例如 hk-cluster" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>描述</FormLabel>
                <FormControl>
                  <Textarea placeholder="可选" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="storage_backend"
            render={({ field }) => (
              <FormItem>
                <FormLabel>存储后端</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="local">本地存储</SelectItem>
                    <SelectItem value="ceph">Ceph</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cluster_mode"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>集群模式</FormLabel>
                  <FormDescription>
                    启用后支持组内虚拟机在线迁移（无需停机）
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={(v) => {
                    field.onChange(v)
                    if (!v) { form.setValue("ha_enabled", false); form.setValue("ovn_enabled", false) }
                  }} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ha_enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>高可用</FormLabel>
                  <FormDescription>
                    启用后节点故障时自动疏散到组内其他节点（需集群模式）
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ovn_enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>私有网络 (OVN)</FormLabel>
                  <FormDescription>
                    启用后可创建 VPC 私有网络，实现实例间 L2 隔离（需集群模式）
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={(v) => {
                    field.onChange(v)
                    if (v) form.setValue("cluster_mode", true)
                  }} />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("ovn_enabled") && (
            <FormField
              control={form.control}
              name="ovn_uplink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OVN Uplink 网络</FormLabel>
                  <FormControl>
                    <Input placeholder="UPLINK" {...field} />
                  </FormControl>
                  <FormDescription>
                    用于 OVN 网络出站连接的上游桥接网络名称
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
