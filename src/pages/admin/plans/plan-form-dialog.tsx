import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  postAdminPlans,
  putAdminPlansById,
  getAdminNodes,
  getAdminImages,
} from "@/api"
import type {
  ProductPlanItem,
  ProductPlanCreateRequest,
  ProductPlanUpdateRequest,
} from "@/api"
import {
  getAdminPlanGroupsOptions,
  getAdminNodesOptions,
  getAdminImagesOptions,
} from "@/api/@tanstack/react-query.gen"
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
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpLink } from "@/components/help-doc"
import { Switch } from "@/components/ui/switch"
import { FormSheet } from "@/components/form-sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { PaginatedMultiSelect, type PaginatedMultiSelectItem } from "@/components/paginated-multi-select"
import { billingCycleMap } from "@/lib/order-constants"

const BILLING_CYCLES = Object.entries(billingCycleMap).map(([value, label]) => ({ value, label }))

const schema = z.object({
  name: z.string().min(1, "请输入名称").max(128),
  description: z.string().max(512).default(""),
  group_id: z.string().default(""),
  type: z.enum(["vm", "container"]).default("vm"),
  cpu: z.coerce.number<number | string>().int().min(1, "至少 1 核"),
  memory: z.coerce.number<number | string>().int().min(1, "请输入内存大小"),
  disk: z.coerce.number<number | string>().int().min(1, "请输入磁盘大小"),
  bandwidth: z.coerce.number<number | string>().int().min(0).default(0),
  traffic: z.coerce.number<number | string>().int().min(0).default(0),
  ip_count: z.coerce.number<number | string>().int().min(0).default(1),
  arch: z.enum(["amd64", "arm64"]).default("amd64"),
  profile_name: z.string().max(64).default(""),
  storage_pool: z.string().max(64).default(""),
  network_name: z.string().max(64).default(""),
  enabled_cycles: z.array(z.string()).min(1, "请至少选择一个计费周期").default([]),
  price_hourly: z.coerce.number<number | string>().int().min(0).default(0),
  price_monthly: z.coerce.number<number | string>().int().min(0).default(0),
  price_quarterly: z.coerce.number<number | string>().int().min(0).default(0),
  price_yearly: z.coerce.number<number | string>().int().min(0).default(0),
  extra_ip_price: z.coerce.number<number | string>().int().min(0).default(0),
  max_extra_ips: z.coerce.number<number | string>().int().min(0).default(0),
  nat_mode: z.boolean().default(false),
  port_count: z.coerce.number<number | string>().int().min(1).default(20),
  cpu_allowance: z.coerce.number<number | string>().int().min(0).max(100).default(0),
  stock: z.coerce.number<number | string>().int().default(-1),
  node_ids: z.array(z.string()).default([]),
  image_ids: z.array(z.string()).default([]),
  status: z.string().default("1"),
  sort_order: z.coerce.number<number | string>().int().min(0).default(0),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

const defaultValues: FormValues = {
  name: "",
  description: "",
  group_id: "",
  type: "vm",
  cpu: 1,
  memory: 1024,
  disk: 20,
  bandwidth: 0,
  traffic: 0,
  ip_count: 1,
  arch: "amd64",
  profile_name: "",
  storage_pool: "",
  network_name: "",
  enabled_cycles: [],
  price_hourly: 0,
  price_monthly: 0,
  price_quarterly: 0,
  price_yearly: 0,
  extra_ip_price: 0,
  max_extra_ips: 0,
  nat_mode: false,
  port_count: 20,
  cpu_allowance: 0,
  stock: -1,
  node_ids: [],
  image_ids: [],
  status: "1",
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues)

function parseIds(str: string | undefined): string[] {
  if (!str) return []
  return str.split(",").map((s) => s.trim()).filter(Boolean)
}

function joinIds(ids: string[]): string {
  return ids.join(",")
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: ProductPlanItem
  onSuccess: () => void
}

const PAGE_SIZE = 20

export default function PlanFormDialog({ open, onOpenChange, plan, onSuccess }: Props) {
  const isEdit = !!plan
  const [serverError, setServerError] = useState("")

  // 套餐分组选项：弹窗打开时才取数
  const groupsQuery = useQuery({
    ...getAdminPlanGroupsOptions({ query: { page_size: 100, status: 1 } }),
    enabled: open,
  })
  const groups = groupsQuery.data?.data?.items ?? []

  // 编辑时已选节点/镜像的初始展示项：ids 经 options 进入 query key
  const nodeIds = useMemo(() => parseIds(plan?.node_ids), [plan?.node_ids])
  const imageIds = useMemo(() => parseIds(plan?.image_ids), [plan?.image_ids])

  const initialNodesQuery = useQuery({
    ...getAdminNodesOptions({ query: { page: 1, page_size: 100, ids: nodeIds.join(",") } }),
    enabled: open && isEdit && nodeIds.length > 0,
  })
  const initialNodeItems = useMemo<PaginatedMultiSelectItem[]>(
    () =>
      (initialNodesQuery.data?.data?.items ?? []).map((n) => ({
        id: String(n.id),
        label: n.name ?? `节点 ${n.id}`,
      })),
    [initialNodesQuery.data]
  )

  const initialImagesQuery = useQuery({
    ...getAdminImagesOptions({ query: { page: 1, page_size: 100, ids: imageIds.join(",") } }),
    enabled: open && isEdit && imageIds.length > 0,
  })
  const initialImageItems = useMemo<PaginatedMultiSelectItem[]>(
    () =>
      (initialImagesQuery.data?.data?.items ?? []).map((img) => ({
        id: String(img.id),
        label: img.name ?? `镜像 ${img.id}`,
      })),
    [initialImagesQuery.data]
  )

  const fetchNodeOptions = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminNodes({
      query: { page, page_size: PAGE_SIZE, status: 1, keyword: keyword || undefined },
    })
    const nodes = res?.data?.items ?? []
    const items = nodes.map((n) => ({
      id: String(n.id),
      label: n.name ?? `节点 ${n.id}`,
      description: [n.region, n.host].filter(Boolean).join(" · "),
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])

  const fetchImageOptions = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminImages({
      query: { page, page_size: PAGE_SIZE, status: 1, keyword: keyword || undefined },
    })
    const images = res?.data?.items ?? []
    const items = images.map((img) => ({
      id: String(img.id),
      label: img.name ?? `镜像 ${img.id}`,
      description: [img.os, img.version, img.arch].filter(Boolean).join(" "),
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const natMode = useWatch({ control: form.control, name: "nat_mode" })

  useEffect(() => {
    if (!open) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerError("")

    if (plan) {
      form.reset({
        name: plan.name ?? "",
        description: plan.description ?? "",
        group_id: plan.group_id ? String(plan.group_id) : "",
        type: (plan.type as "vm" | "container") ?? "vm",
        cpu: plan.cpu ?? 1,
        memory: plan.memory ?? 1024,
        disk: plan.disk ?? 20,
        bandwidth: plan.bandwidth ?? 0,
        traffic: plan.traffic ?? 0,
        ip_count: plan.ip_count ?? 1,
        arch: (plan.arch as "amd64" | "arm64") ?? "amd64",
        profile_name: plan.profile_name ?? "",
        storage_pool: plan.storage_pool ?? "",
        network_name: plan.network_name ?? "",
        enabled_cycles: plan.enabled_cycles ? plan.enabled_cycles.split(',').filter(Boolean) : [],
        price_hourly: plan.price_hourly ?? 0,
        price_monthly: plan.price_monthly ?? 0,
        price_quarterly: plan.price_quarterly ?? 0,
        price_yearly: plan.price_yearly ?? 0,
        extra_ip_price: (plan as Record<string, unknown>).extra_ip_price as number ?? 0,
        max_extra_ips: (plan as Record<string, unknown>).max_extra_ips as number ?? 0,
        nat_mode: (plan as Record<string, unknown>).nat_mode as boolean ?? false,
        port_count: (plan as Record<string, unknown>).port_count as number ?? 20,
        cpu_allowance: (plan as Record<string, unknown>).cpu_allowance as number ?? 0,
        stock: plan.stock ?? -1,
        node_ids: nodeIds,
        image_ids: imageIds,
        status: String(plan.status ?? 1),
        sort_order: plan.sort_order ?? 0,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, plan, form, nodeIds, imageIds])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      // 创建/更新共用请求体：clear_group_id 仅存在于更新请求类型中
      const body: ProductPlanCreateRequest & Pick<ProductPlanUpdateRequest, "clear_group_id"> = {
        name: values.name,
        description: values.description || undefined,
        type: values.type,
        cpu: values.cpu,
        memory: values.memory,
        disk: values.disk,
        bandwidth: values.bandwidth,
        traffic: values.traffic,
        ip_count: values.ip_count,
        arch: values.arch,
        profile_name: values.profile_name || undefined,
        storage_pool: values.storage_pool || undefined,
        network_name: values.network_name || undefined,
        enabled_cycles: values.enabled_cycles.join(','),
        price_hourly: values.price_hourly,
        price_monthly: values.price_monthly,
        price_quarterly: values.price_quarterly,
        price_yearly: values.price_yearly,
        extra_ip_price: values.extra_ip_price,
        max_extra_ips: values.max_extra_ips,
        nat_mode: values.nat_mode,
        port_count: values.port_count,
        cpu_allowance: values.cpu_allowance,
        stock: values.stock,
        node_ids: joinIds(values.node_ids),
        image_ids: joinIds(values.image_ids),
        status: Number(values.status),
        sort_order: values.sort_order,
      }

      if (values.group_id) {
        body.group_id = Number(values.group_id)
      } else if (isEdit) {
        body.clear_group_id = true
      }

      const { data: res } = isEdit
        ? await putAdminPlansById({ path: { id: plan!.id! }, body })
        : await postAdminPlans({ body })

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
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "编辑套餐" : "添加套餐"}
      description={isEdit ? "修改套餐的资源配置和定价" : "创建一个新的套餐，定义资源规格和价格"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="plan-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "提交中..." : isEdit ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" data-tour="plan-form">
          <section data-tour="plan-form-basic">
            <h3 className="text-sm font-medium">基础信息</h3>
            <p className="text-xs text-muted-foreground mt-1">套餐名称、描述和分组</p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>名称</FormLabel>
                      <FormControl><Input placeholder="基础型 1核1G" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分组</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="选择分组" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">不设分组</SelectItem>
                          {groups.map(g => (
                            <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                          ))}
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
                    <FormControl><Textarea rows={2} placeholder="适合轻量应用和个人网站" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section data-tour="plan-form-resource">
            <h3 className="text-sm font-medium">资源配置</h3>
            <p className="text-xs text-muted-foreground mt-1">CPU、内存、磁盘和网络</p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>类型</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vm">虚拟机</SelectItem>
                          <SelectItem value="container">容器</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>架构</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="amd64">x86_64</SelectItem>
                          <SelectItem value="arm64">ARM64</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!natMode && (
                <FormField
                  control={form.control}
                  name="ip_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP 数量</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              </div>
              <div className="flex items-center gap-3 py-2">
                <Switch
                  checked={natMode}
                  onCheckedChange={(v) => {
                    form.setValue("nat_mode", v)
                    form.setValue("ip_count", v ? 0 : 1)
                  }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Label>NAT 模式</Label>
                    <HelpLink path="/novaix/shared-ip" />
                  </div>
                  <p className="text-xs text-muted-foreground">启用后实例共享公网 IP，通过端口转发访问</p>
                </div>
              </div>
              {natMode && (
                <FormField
                  control={form.control}
                  name="port_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>端口数量</FormLabel>
                      <FormControl><Input type="number" placeholder="20" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cpu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>CPU (核)</FormLabel>
                      <FormControl><Input type="number" placeholder="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpu_allowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPU 使用率限制 (%)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormDescription>0 表示不限</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="memory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>内存 (MiB)</FormLabel>
                      <FormControl><Input type="number" placeholder="1024" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="disk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>磁盘 (GB)</FormLabel>
                      <FormControl><Input type="number" placeholder="20" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bandwidth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>带宽 (Mbps)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormDescription>0 表示不限</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="traffic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>月流量 (GB)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormDescription>0 表示不限</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section data-tour="plan-form-price">
            <h3 className="text-sm font-medium">定价</h3>
            <p className="text-xs text-muted-foreground mt-1">勾选启用的计费周期，价格单位为分（如 2000 = ¥20.00），价格为 0 表示免费</p>
            <div className="mt-4 flex flex-col gap-4">
              <FormField
                control={form.control}
                name="enabled_cycles"
                render={({ field }) => {
                  const cycles = field.value ?? []
                  return (
                  <FormItem>
                    <div className="flex items-center gap-6">
                      {BILLING_CYCLES.map((cycle) => (
                        <label key={cycle.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={cycles.includes(cycle.value)}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...cycles, cycle.value]
                                : cycles.filter((v: string) => v !== cycle.value)
                              field.onChange(next)
                            }}
                          />
                          {cycle.label}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                  )
                }}
              />
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="price_hourly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>时付 (分)</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_monthly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>月付 (分)</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="2000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_quarterly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>季付 (分)</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="5400" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_yearly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>年付 (分)</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="19200" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="extra_ip_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{natMode ? '独享 IP 月价 (分)' : '附加 IP 月价 (分)'}</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                      <FormDescription>{natMode ? '独享公网 IP（独立出口 + 全端口入站）的月费用，0 表示不支持' : '每个附加 IP 的月费用，0 表示不支持附加 IP'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_extra_ips"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{natMode ? '最大独享 IP 数' : '最大附加 IP 数'}</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormDescription>{natMode ? '每台实例最多可绑定的独享 IP 数量' : '每台实例最多可添加的附加 IP 数量'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium">运行环境配置</h3>
            <p className="text-xs text-muted-foreground mt-1">Profile、存储池和网络，留空使用节点默认值</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="profile_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile</FormLabel>
                    <FormControl><Input placeholder="留空使用默认" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="留空使用默认" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="network_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>网络</FormLabel>
                    <FormControl><Input placeholder="留空使用默认" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator />

          <section data-tour="plan-form-sales">
            <h3 className="text-sm font-medium">销售设置</h3>
            <p className="text-xs text-muted-foreground mt-1">库存、可用节点和镜像限制</p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>库存</FormLabel>
                      <FormControl><Input type="number" placeholder="-1" {...field} /></FormControl>
                      <FormDescription>-1 表示不限</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sort_order"
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
                          <SelectItem value="1">上架</SelectItem>
                          <SelectItem value="0">下架</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="node_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>可用节点</FormLabel>
                    <FormControl>
                      <PaginatedMultiSelect
                        value={field.value ?? []}
                        onChange={field.onChange}
                        fetchFn={fetchNodeOptions}
                        initialItems={initialNodeItems}
                        placeholder="全部节点可用"
                        searchPlaceholder="搜索节点..."
                        emptyText="无可用节点"
                      />
                    </FormControl>
                    <FormDescription>不选择则所有节点均可使用此套餐</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>可用镜像</FormLabel>
                    <FormControl>
                      <PaginatedMultiSelect
                        value={field.value ?? []}
                        onChange={field.onChange}
                        fetchFn={fetchImageOptions}
                        initialItems={initialImageItems}
                        placeholder="全部镜像可用"
                        searchPlaceholder="搜索镜像..."
                        emptyText="无可用镜像"
                      />
                    </FormControl>
                    <FormDescription>不选择则所有镜像均可使用此套餐</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
