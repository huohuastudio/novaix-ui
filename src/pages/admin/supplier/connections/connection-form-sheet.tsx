import { useEffect, useState, type ReactNode } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { postAdminSupplierConnections, putAdminSupplierConnectionsById } from "@/api"
import type { ProviderField, ServiceSupplierConnectionView, ServiceSupplierPluginItem } from "@/api"
import {
  getAdminSupplierConnectionsByIdQueryKey,
  getAdminSupplierConnectionsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Form,
  FormControl,
  FormDescription,
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
import { FormSheet } from "@/components/form-sheet"
import { FieldGrid, type RemoteOptionsFetch } from "@/components/provider-settings-form"
import { useSupplierDynamicConfig, useSupplierPlugins, useSupplierRemoteOptions } from "@/hooks/use-supplier-meta"
import { useCurrencySymbol, useSiteSettings } from "@/hooks/use-site-settings"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { centsToYuan, yuanField, yuanToCents } from "@/lib/order-constants"
import {
  collectDynamicValues,
  connectionStatusOptions,
  dynamicFieldValue,
  dynamicFieldValues,
  remoteLabelsOf,
  validateDynamicFields,
} from "@/lib/supplier-constants"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string().trim().min(1, "请输入连接名称").max(64, "名称不能超过 64 个字符"),
  status: z.enum(["active", "maintenance", "disabled"]).default("active"),
  balance_alert_threshold: yuanField().default(0),
  rate_limit_per_minute: z.coerce.number<number | string>().int("请输入整数").min(0, "不能小于 0").max(6000, "不能超过 6000").default(0),
  remark: z.string().max(255, "备注不能超过 255 个字符").default(""),
})

type FormInput = z.input<typeof formSchema>
type FormValues = z.output<typeof formSchema>
type ConnectionForm = UseFormReturn<FormInput, unknown, FormValues>

const defaultValues: FormValues = {
  name: "",
  status: "active",
  balance_alert_threshold: 0,
  rate_limit_per_minute: 0,
  remark: "",
}

const fieldNames = [...Object.keys(defaultValues), "plugin_id"]

function toBody(values: FormValues) {
  return {
    name: values.name,
    status: values.status,
    balance_alert_threshold: yuanToCents(values.balance_alert_threshold),
    rate_limit_per_minute: values.rate_limit_per_minute,
    remark: values.remark,
  }
}

/** 插件动态字段区域 */
function ConnectionConfigFields({
  plugin,
  config,
  errors,
  onChange,
  remoteFetch,
}: {
  plugin?: ServiceSupplierPluginItem
  config: Record<string, string>
  errors: Record<string, string>
  onChange: (f: ProviderField, v: string) => void
  remoteFetch?: RemoteOptionsFetch
}) {
  const { site_url: siteURL } = useSiteSettings()
  const fields = plugin?.connection_fields ?? []

  return (
    <section>
      <h3 className="text-sm font-medium">连接配置</h3>
      <p className="text-xs text-muted-foreground mt-1">上游接口地址、账号与密钥等，由插件声明。敏感字段保持掩码不修改即保留原值</p>
      <div className="mt-4">
        {!plugin ? (
          <p className="text-sm text-muted-foreground">请先选择供应商插件</p>
        ) : fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">该插件无需连接配置</p>
        ) : (
          <FieldGrid
            fields={fields}
            fieldValues={dynamicFieldValues(fields, config)}
            errors={errors}
            getValue={(f) => dynamicFieldValue(f, config)}
            onChange={onChange}
            descriptorName={plugin.id}
            siteURL={siteURL}
            remoteFetch={remoteFetch}
            remoteLabels={remoteLabelsOf(fields, config)}
          />
        )}
      </div>
    </section>
  )
}

/** 连接基础字段（名称、状态、告警阈值、限速、备注），插件区域通过 pluginSection 插槽注入 */
function ConnectionFormFields({
  form,
  pluginSection,
  configSection,
}: {
  form: ConnectionForm
  pluginSection: ReactNode
  configSection: ReactNode
}) {
  const currencySymbol = useCurrencySymbol()

  return (
    <>
      <section>
        <h3 className="text-sm font-medium">供应商插件</h3>
        <p className="text-xs text-muted-foreground mt-1">插件负责对接上游接口，连接创建后不可更换插件</p>
        <div className="mt-4">{pluginSection}</div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium">基础信息</h3>
        <p className="text-xs text-muted-foreground mt-1">连接名称、状态与调用限制</p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>名称</FormLabel>
                  <FormControl><Input placeholder="例如 XX 云" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>状态</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connectionStatusOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>维护状态下停止新购，已有服务照常续费与操作</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="balance_alert_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>余额告警阈值（{currencySymbol}）</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>上游余额低于此值时告警，0 表示使用系统默认阈值</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rate_limit_per_minute"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>每分钟调用上限</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={6000} placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>限制对上游的调用频率，0 表示使用默认值</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="remark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>备注</FormLabel>
                <FormControl><Textarea rows={2} placeholder="仅管理员可见" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      <Separator />

      {configSection}
    </>
  )
}

/** 插件选择列表 */
function PluginPicker({
  plugins,
  loading,
  value,
  onChange,
}: {
  plugins: ServiceSupplierPluginItem[]
  loading: boolean
  value: string
  onChange: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
    )
  }
  if (plugins.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无已安装的供应商插件，请先在插件页面安装</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {plugins.map((p) => {
        const selected = value === p.id
        const disabled = !p.enabled
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.id ?? "")}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
            )}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{p.name ?? p.id}</span>
              {p.version && <span className="text-xs text-muted-foreground">v{p.version}</span>}
              {p.builtin && <Badge variant="secondary" className="text-2xs px-1.5 py-0">内置</Badge>}
              {disabled && <Badge variant="outline" className="text-2xs px-1.5 py-0">未启用</Badge>}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">{p.id}</div>
          </button>
        )
      })}
    </div>
  )
}

interface CreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ConnectionCreateSheet({ open, onOpenChange, onSuccess }: CreateProps) {
  const queryClient = useQueryClient()
  const { plugins, pluginMap, loading } = useSupplierPlugins(open)
  const [pluginId, setPluginId] = useState("")
  const [pluginError, setPluginError] = useState("")
  const [serverError, setServerError] = useState("")
  const dyn = useSupplierDynamicConfig()
  const { setConfig, setErrors } = dyn
  const plugin = pluginId ? pluginMap.get(pluginId) : undefined

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时重置表单状态
      setServerError("")
      setPluginId("")
      setPluginError("")
      setConfig({})
      setErrors({})
      form.reset(defaultValues)
    }
  }, [open, form, setConfig, setErrors])

  const selectPlugin = (id: string) => {
    setPluginId(id)
    setPluginError("")
    setConfig({})
    setErrors({})
  }

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    if (!plugin) {
      setPluginError("请选择供应商插件")
      return
    }
    const fields = plugin.connection_fields ?? []
    const errs = validateDynamicFields(fields, dyn.config)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      const { data: res } = await postAdminSupplierConnections({
        body: { ...toBody(values), plugin_id: plugin.id, config: collectDynamicValues(fields, dyn.config) },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      toast.success("连接已创建")
      queryClient.invalidateQueries({ queryKey: getAdminSupplierConnectionsQueryKey() })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="新建供应商连接"
      description="选择供应商插件并填写上游接入信息"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button form="supplier-connection-create-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "创建中..." : "创建"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="supplier-connection-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <ConnectionFormFields
            form={form}
            pluginSection={
              <div className="space-y-2">
                <PluginPicker plugins={plugins} loading={loading} value={pluginId} onChange={selectPlugin} />
                {pluginError && <p className="text-xs text-destructive">{pluginError}</p>}
              </div>
            }
            configSection={
              <ConnectionConfigFields plugin={plugin} config={dyn.config} errors={dyn.errors} onChange={(f, v) => dyn.change(f, v)} />
            }
          />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

interface EditProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: ServiceSupplierConnectionView
  onSuccess: () => void
}

export function ConnectionEditSheet({ open, onOpenChange, connection, onSuccess }: EditProps) {
  const queryClient = useQueryClient()
  const { pluginMap, loading } = useSupplierPlugins(open)
  const [serverError, setServerError] = useState("")
  const plugin = pluginMap.get(connection.plugin_id ?? "")

  const dyn = useSupplierDynamicConfig()
  const { setConfig, setErrors } = dyn
  // 远程选项需要已保存的连接，按当前填写值向上游查询
  const { remoteFetch, labelOf } = useSupplierRemoteOptions(connection.id, "connection", dyn.config)

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时按连接数据重置表单
      setServerError("")
      setConfig({ ...(connection.config ?? {}) })
      setErrors({})
      form.reset({
        name: connection.name ?? "",
        status: (connection.status as FormValues["status"]) || "active",
        balance_alert_threshold: centsToYuan(connection.balance_alert_threshold),
        rate_limit_per_minute: connection.rate_limit_per_minute ?? 0,
        remark: connection.remark ?? "",
      })
    }
  }, [open, connection, form, setConfig, setErrors])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    const fields = plugin?.connection_fields ?? []
    const errs = validateDynamicFields(fields, dyn.config)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      const { data: res } = await putAdminSupplierConnectionsById({
        path: { id: connection.id! },
        body: {
          ...toBody(values),
          plugin_id: connection.plugin_id,
          // 插件缺失时无法识别字段，保留原配置不提交
          config: plugin ? collectDynamicValues(fields, dyn.config) : undefined,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      toast.success("连接已保存")
      queryClient.invalidateQueries({ queryKey: getAdminSupplierConnectionsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierConnectionsByIdQueryKey({ path: { id: connection.id! } }) })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="编辑供应商连接"
      description={`修改连接「${connection.name ?? ""}」的配置`}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button form="supplier-connection-edit-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "保存中..." : "保存"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="supplier-connection-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <ConnectionFormFields
            form={form}
            pluginSection={
              loading ? (
                <Skeleton className="h-16 rounded-md max-w-sm" />
              ) : (
                <div className="rounded-md border px-3 py-2.5 max-w-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{plugin?.name ?? connection.plugin_name ?? connection.plugin_id}</span>
                    {plugin?.version && <span className="text-xs text-muted-foreground">v{plugin.version}</span>}
                    {plugin?.builtin && <Badge variant="secondary" className="text-2xs px-1.5 py-0">内置</Badge>}
                    {plugin && !plugin.enabled && <Badge variant="outline" className="text-2xs px-1.5 py-0">未启用</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-mono">{connection.plugin_id}</div>
                  {!plugin && (
                    <p className="mt-1.5 text-xs text-destructive">插件未安装或已卸载，暂时无法修改连接配置</p>
                  )}
                </div>
              )
            }
            configSection={
              loading ? (
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 col-span-2" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : (
                <ConnectionConfigFields
                  plugin={plugin}
                  config={dyn.config}
                  errors={dyn.errors}
                  onChange={(f, v) => dyn.change(f, v, labelOf(f, v))}
                  remoteFetch={remoteFetch}
                />
              )
            }
          />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
