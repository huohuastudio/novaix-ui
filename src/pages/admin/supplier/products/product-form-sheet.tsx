import { useEffect, useState, type ReactNode } from "react"
import { useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { postAdminSupplierProducts, putAdminSupplierProductsById } from "@/api"
import type { ProviderField, ServiceModuleProductView, SupplierProductRequest } from "@/api"
import {
  getAdminSupplierProductsByIdQueryKey,
  getAdminSupplierProductsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
import {
  useSupplierConnectionList,
  useSupplierDynamicConfig,
  useSupplierPlugins,
  useSupplierRemoteOptions,
} from "@/hooks/use-supplier-meta"
import { useCurrencySymbol, useSiteSettings } from "@/hooks/use-site-settings"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { centsToYuan, yuanField, yuanToCents } from "@/lib/order-constants"
import {
  MODULE_CYCLES,
  collectDynamicValues,
  dynamicFieldValue,
  dynamicFieldValues,
  productStatusOptions,
  remoteLabelsOf,
  validateDynamicFields,
} from "@/lib/supplier-constants"

const intField = (min = 0, message = "不能为负数") =>
  z.coerce.number<number | string>().int("请输入整数").min(min, message)

const formSchema = z.object({
  connection_id: z.string().min(1, "请选择供应商连接"),
  name: z.string().trim().min(1, "请输入商品名称").max(128, "名称不能超过 128 个字符"),
  description: z.string().max(5000, "描述不能超过 5000 个字符").default(""),
  category: z.string().trim().max(64, "分类不能超过 64 个字符").default(""),
  region: z.string().trim().max(64, "地域不能超过 64 个字符").default(""),
  cpu: intField().default(0),
  memory: intField().default(0),
  disk: intField().default(0),
  bandwidth: intField().default(0),
  traffic: intField().default(0),
  enabled_cycles: z.array(z.string()).min(1, "请至少选择一个计费周期").default([]),
  price_monthly: yuanField().default(0),
  price_quarterly: yuanField().default(0),
  price_yearly: yuanField().default(0),
  cost_monthly: yuanField().default(0),
  cost_quarterly: yuanField().default(0),
  cost_yearly: yuanField().default(0),
  stock: intField(-1, "库存不能小于 -1").default(-1),
  status: z.enum(["on_sale", "hidden", "off"]).default("on_sale"),
  sort: z.coerce.number<number | string>().int("请输入整数").default(0),
  require_kyc: z.boolean().default(false),
  checkout_fields: z.array(z.string()).default([]),
  hidden_actions: z.string().max(500, "不能超过 500 个字符").default(""),
})

type FormInput = z.input<typeof formSchema>
type FormValues = z.output<typeof formSchema>
type ProductForm = UseFormReturn<FormInput, unknown, FormValues>

const defaultValues: FormValues = {
  connection_id: "",
  name: "",
  description: "",
  category: "",
  region: "",
  cpu: 0,
  memory: 0,
  disk: 0,
  bandwidth: 0,
  traffic: 0,
  enabled_cycles: ["monthly"],
  price_monthly: 0,
  price_quarterly: 0,
  price_yearly: 0,
  cost_monthly: 0,
  cost_quarterly: 0,
  cost_yearly: 0,
  stock: -1,
  status: "on_sale",
  sort: 0,
  require_kyc: false,
  checkout_fields: [],
  hidden_actions: "",
}

const fieldNames = [...Object.keys(defaultValues), "product_config"]

function toBody(values: FormValues, productConfig: Record<string, string>): SupplierProductRequest {
  return {
    connection_id: Number(values.connection_id),
    name: values.name,
    description: values.description,
    category: values.category,
    region: values.region,
    cpu: values.cpu,
    memory: values.memory,
    disk: values.disk,
    bandwidth: values.bandwidth,
    traffic: values.traffic,
    enabled_cycles: values.enabled_cycles,
    price_monthly: yuanToCents(values.price_monthly),
    price_quarterly: yuanToCents(values.price_quarterly),
    price_yearly: yuanToCents(values.price_yearly),
    cost_monthly: yuanToCents(values.cost_monthly),
    cost_quarterly: yuanToCents(values.cost_quarterly),
    cost_yearly: yuanToCents(values.cost_yearly),
    stock: values.stock,
    status: values.status,
    sort: values.sort,
    require_kyc: values.require_kyc,
    checkout_fields: values.checkout_fields,
    hidden_actions: values.hidden_actions.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean),
    product_config: productConfig,
  }
}

/** 当前连接对应插件的字段与远程选项 */
function useProductPlugin(form: ProductForm, fallbackPluginId?: string) {
  const { connections } = useSupplierConnectionList()
  const { pluginMap } = useSupplierPlugins()
  const connectionId = useWatch({ control: form.control, name: "connection_id" })
  const connection = connections.find((c) => String(c.id) === connectionId)
  const plugin = pluginMap.get(connection?.plugin_id ?? fallbackPluginId ?? "")
  return { connections, connectionId: connectionId ? Number(connectionId) : undefined, plugin }
}

/** 商品配置（插件 product_fields）区域 */
function ProductConfigSection({
  pluginName,
  fields,
  connected,
  config,
  errors,
  onChange,
  remoteFetch,
}: {
  pluginName?: string
  fields: ProviderField[]
  connected: boolean
  config: Record<string, string>
  errors: Record<string, string>
  onChange: (f: ProviderField, v: string) => void
  remoteFetch: RemoteOptionsFetch
}) {
  const { site_url: siteURL } = useSiteSettings()
  if (!connected) return <p className="text-sm text-muted-foreground">请先选择供应商连接</p>
  if (fields.length === 0) return <p className="text-sm text-muted-foreground">该连接的插件无需商品配置</p>
  return (
    <FieldGrid
      fields={fields}
      fieldValues={dynamicFieldValues(fields, config)}
      errors={errors}
      getValue={(f) => dynamicFieldValue(f, config)}
      onChange={onChange}
      descriptorName={pluginName}
      siteURL={siteURL}
      remoteFetch={remoteFetch}
      remoteLabels={remoteLabelsOf(fields, config)}
    />
  )
}

/** 商品表单字段；上游配置区域（插件动态字段）通过 configSection 插槽注入 */
function ProductFormFields({
  form,
  connections,
  checkoutFields,
  onConnectionChange,
  configSection,
}: {
  form: ProductForm
  connections: { id?: number; name?: string; plugin_name?: string; status?: string }[]
  checkoutFields: ProviderField[]
  onConnectionChange: () => void
  configSection: ReactNode
}) {
  const currencySymbol = useCurrencySymbol()

  return (
    <>
      <section>
        <h3 className="text-sm font-medium">基础信息</h3>
        <p className="text-xs text-muted-foreground mt-1">商品名称、分类与描述，展示给用户</p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>名称</FormLabel>
                  <FormControl><Input placeholder="例如 香港 2核4G" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分类</FormLabel>
                  <FormControl><Input placeholder="例如 香港云服务器" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>地域</FormLabel>
                  <FormControl><Input placeholder="例如 香港" {...field} /></FormControl>
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
                <FormControl><Textarea rows={2} placeholder="线路、配置亮点等" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium">上游配置</h3>
        <p className="text-xs text-muted-foreground mt-1">选择供应商连接，并固定一组上游配置作为本商品</p>
        <div className="mt-4 flex flex-col gap-4">
          <FormField
            control={form.control}
            name="connection_id"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel required>供应商连接</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    if (v === field.value) return
                    field.onChange(v)
                    onConnectionChange()
                  }}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="选择连接" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                        {c.plugin_name && <span className="text-xs text-muted-foreground">（{c.plugin_name}）</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {connections.length === 0 ? "暂无供应商连接，请先在供应商连接页面创建" : "更换连接会清空下方的上游配置与下单字段"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {configSection}
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium">展示规格</h3>
        <p className="text-xs text-muted-foreground mt-1">仅用于前台展示，不影响上游开通配置，0 表示不展示</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {([
            ["cpu", "CPU（核）"],
            ["memory", "内存（MB）"],
            ["disk", "磁盘（GB）"],
            ["bandwidth", "带宽（Mbps）"],
            ["traffic", "流量（GB）"],
          ] as const).map(([name, label]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium">定价</h3>
        <p className="text-xs text-muted-foreground mt-1">勾选启用的计费周期并填写售价（单位：元），参考成本用于毛利统计</p>
        <div className="mt-4">
          <FormField
            control={form.control}
            name="enabled_cycles"
            render={({ field }) => {
              const cycles = field.value ?? []
              return (
                <FormItem>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {MODULE_CYCLES.map((cycle) => {
                      const checked = cycles.includes(cycle.value)
                      const priceName = `price_${cycle.value}` as const
                      const costName = `cost_${cycle.value}` as const
                      return (
                        <div key={cycle.value} className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                field.onChange(v ? [...cycles, cycle.value] : cycles.filter((c) => c !== cycle.value))
                              }}
                            />
                            {cycle.label}
                          </label>
                          <FormField
                            control={form.control}
                            name={priceName}
                            render={({ field: priceField }) => (
                              <FormItem>
                                <div className="relative">
                                  <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">{currencySymbol}</span>
                                  <FormControl>
                                    <Input type="number" min={0} step="0.01" disabled={!checked} className="pl-7" placeholder="售价" {...priceField} />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={costName}
                            render={({ field: costField }) => (
                              <FormItem>
                                <div className="relative">
                                  <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs text-muted-foreground">成本</span>
                                  <FormControl>
                                    <Input type="number" min={0} step="0.01" disabled={!checked} className="pl-10" placeholder="参考成本" {...costField} />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium">销售设置</h3>
        <p className="text-xs text-muted-foreground mt-1">库存、排序与上架状态</p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4 items-start">
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>库存</FormLabel>
                  <FormControl><Input type="number" min={-1} placeholder="-1" {...field} /></FormControl>
                  <FormDescription>-1 表示不限</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>排序</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormDescription>越小越靠前</FormDescription>
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
                      {productStatusOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>隐藏后不可新购，已购服务仍可续费</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="require_kyc"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>需要实名认证</FormLabel>
                  <FormDescription>开启后，用户必须完成实名认证才能购买此商品</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-medium">下单与操作</h3>
        <p className="text-xs text-muted-foreground mt-1">用户下单时需要填写的字段，以及不对用户开放的操作</p>
        <div className="mt-4 flex flex-col gap-4">
          <FormField
            control={form.control}
            name="checkout_fields"
            render={({ field }) => {
              const selected = field.value ?? []
              return (
                <FormItem>
                  <FormLabel>下单字段</FormLabel>
                  {checkoutFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">该连接的插件没有可选的下单字段</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {checkoutFields.map((f) => (
                        <div key={f.key} className="flex items-start gap-2">
                          <Checkbox
                            id={`checkout-${f.key}`}
                            className="mt-0.5"
                            checked={selected.includes(f.key ?? "")}
                            onCheckedChange={(v) => {
                              const key = f.key ?? ""
                              field.onChange(v ? [...selected, key] : selected.filter((k) => k !== key))
                            }}
                          />
                          <Label htmlFor={`checkout-${f.key}`} className="font-normal cursor-pointer flex-col items-start gap-0.5">
                            <span>
                              {f.label ?? f.key}
                              {f.required && <span className="text-destructive"> *</span>}
                            </span>
                            {f.help && <span className="text-xs text-muted-foreground">{f.help}</span>}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormDescription>勾选的字段会出现在用户下单页面，例如操作系统、登录密码</FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="hidden_actions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>对用户隐藏的操作</FormLabel>
                <FormControl><Input placeholder="例如 reinstall, reset_password" className="font-mono" {...field} /></FormControl>
                <FormDescription>填写插件操作标识，多个用逗号分隔；隐藏后用户不可执行，管理员仍可在服务详情中操作</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>
    </>
  )
}

/** 商品表单容器：插件动态配置的状态、远程选项与提交逻辑由创建/编辑表单各自持有 */
function useProductDynamicConfig(form: ProductForm, fallbackPluginId?: string) {
  const { connections, connectionId, plugin } = useProductPlugin(form, fallbackPluginId)
  const dyn = useSupplierDynamicConfig()
  const { remoteFetch, labelOf } = useSupplierRemoteOptions(connectionId, "product", dyn.config)
  const fields = plugin?.product_fields ?? []

  const configSection = (
    <ProductConfigSection
      pluginName={plugin?.id}
      fields={fields}
      connected={!!connectionId}
      config={dyn.config}
      errors={dyn.errors}
      onChange={(f, v) => dyn.change(f, v, labelOf(f, v))}
      remoteFetch={remoteFetch}
    />
  )

  // 校验并收集动态配置，失败返回 null
  const collect = () => {
    const errs = validateDynamicFields(fields, dyn.config)
    dyn.setErrors(errs)
    if (Object.keys(errs).length > 0) return null
    return collectDynamicValues(fields, dyn.config)
  }

  const resetConnection = () => {
    dyn.setConfig({})
    dyn.setErrors({})
    form.setValue("checkout_fields", [])
  }

  return { connections, plugin, dyn, configSection, collect, resetConnection }
}

interface CreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ProductCreateSheet({ open, onOpenChange, onSuccess }: CreateProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState("")
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })
  const { connections, plugin, dyn, configSection, collect, resetConnection } = useProductDynamicConfig(form)
  const { setConfig, setErrors } = dyn

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时重置表单状态
      setServerError("")
      setConfig({})
      setErrors({})
      form.reset(defaultValues)
    }
  }, [open, form, setConfig, setErrors])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    const productConfig = collect()
    if (!productConfig) return
    try {
      const { data: res } = await postAdminSupplierProducts({ body: toBody(values, productConfig) })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      toast.success("商品已创建")
      queryClient.invalidateQueries({ queryKey: getAdminSupplierProductsQueryKey() })
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
      title="添加模块商品"
      description="基于供应商连接创建一个可售卖的商品"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button form="module-product-create-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "创建中..." : "创建"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="module-product-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <ProductFormFields
            form={form}
            connections={connections}
            checkoutFields={plugin?.checkout_fields ?? []}
            onConnectionChange={resetConnection}
            configSection={configSection}
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
  product: ServiceModuleProductView
  onSuccess: () => void
}

export function ProductEditSheet({ open, onOpenChange, product, onSuccess }: EditProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState("")
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })
  const { connections, plugin, dyn, configSection, collect, resetConnection } = useProductDynamicConfig(form, product.plugin_id)
  const { setConfig, setErrors } = dyn

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时按商品数据重置表单
      setServerError("")
      setConfig({ ...(product.product_config_map ?? {}) })
      setErrors({})
      form.reset({
        connection_id: product.connection_id ? String(product.connection_id) : "",
        name: product.name ?? "",
        description: product.description ?? "",
        category: product.category ?? "",
        region: product.region ?? "",
        cpu: product.cpu ?? 0,
        memory: product.memory ?? 0,
        disk: product.disk ?? 0,
        bandwidth: product.bandwidth ?? 0,
        traffic: product.traffic ?? 0,
        enabled_cycles: (product.enabled_cycles ?? "").split(",").filter(Boolean),
        price_monthly: centsToYuan(product.price_monthly),
        price_quarterly: centsToYuan(product.price_quarterly),
        price_yearly: centsToYuan(product.price_yearly),
        cost_monthly: centsToYuan(product.cost_monthly),
        cost_quarterly: centsToYuan(product.cost_quarterly),
        cost_yearly: centsToYuan(product.cost_yearly),
        stock: product.stock ?? -1,
        status: (product.status as FormValues["status"]) || "off",
        sort: product.sort ?? 0,
        require_kyc: product.require_kyc ?? false,
        checkout_fields: product.checkout_field_list ?? [],
        hidden_actions: (product.hidden_action_list ?? []).join(", "),
      })
    }
  }, [open, product, form, setConfig, setErrors])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    const productConfig = collect()
    if (!productConfig) return
    try {
      const { data: res } = await putAdminSupplierProductsById({
        path: { id: product.id! },
        body: toBody(values, productConfig),
      })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      toast.success("商品已保存")
      queryClient.invalidateQueries({ queryKey: getAdminSupplierProductsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierProductsByIdQueryKey({ path: { id: product.id! } }) })
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
      title="编辑模块商品"
      description="修改商品配置与价格，已购服务沿用购买时的配置不受影响"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button form="module-product-edit-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "保存中..." : "保存"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="module-product-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <ProductFormFields
            form={form}
            connections={connections}
            checkoutFields={plugin?.checkout_fields ?? []}
            onConnectionChange={resetConnection}
            configSection={configSection}
          />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
