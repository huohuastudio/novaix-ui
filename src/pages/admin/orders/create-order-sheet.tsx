"use no memo";
import { useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  postAdminOrders,
  getAdminPlans,
  getAdminNodes,
  getAdminImages,
  getAdminUsers,
  getAdminIpsFree,
} from "@/api"
import type { ProductPlanItem } from "@/api"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
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
import { PaginatedCombobox } from "@/components/paginated-combobox"
import { User, Server, Globe, Box, MonitorCog } from "lucide-react"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"

const PAGE_SIZE = 20

const schema = z.object({
  // 这些字段仅由数字选择器写入，输入侧始终为 number
  user_id: z.coerce.number<number>().min(1, "请选择用户"),
  plan_id: z.coerce.number<number>().min(1, "请选择套餐"),
  billing_cycle: z.enum(["hourly", "monthly", "quarterly", "yearly"], { message: "请选择计费周期" }),
  node_id: z.coerce.number<number>().min(1, "请选择节点"),
  image_id: z.coerce.number<number>().min(1, "请选择镜像"),
  password: z.string().min(6, "密码至少 6 位").max(256),
  hostname: z.string().max(128).optional(),
  quantity: z.coerce.number<number>().min(1).max(100).default(1),
  ip_id: z.coerce.number<number>().optional(),
  auto_pay: z.boolean().default(true),
  first_period_free: z.boolean().default(false),
  free_reason: z.string().trim().max(255, "赠送原因不能超过 255 字").default(""),
}).superRefine((value, ctx) => {
  if (value.first_period_free && value.billing_cycle === "hourly") {
    ctx.addIssue({ code: "custom", path: ["billing_cycle"], message: "小时计费不支持首期免费" })
  }
  if (value.first_period_free && !value.free_reason) {
    ctx.addIssue({ code: "custom", path: ["free_reason"], message: "请填写赠送原因" })
  }
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function CreateOrderSheet({ open, onOpenChange, onSuccess }: Props) {
  const formatAmount = useFormatAmount()
  const [serverError, setServerError] = useState("")
  const [planMap, setPlanMap] = useState<Map<number, ProductPlanItem>>(new Map())

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: 0,
      plan_id: 0,
      billing_cycle: "monthly",
      node_id: 0,
      image_id: 0,
      password: "",
      hostname: "",
      quantity: 1,
      ip_id: undefined,
      auto_pay: true,
      first_period_free: false,
      free_reason: "",
    },
  })

  const fetchUsers = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminUsers({
      query: { page, page_size: PAGE_SIZE, keyword: keyword || undefined },
    })
    const items = (res?.data?.items ?? []).map((u) => ({
      id: u.id!,
      label: `${u.username} (${u.email})`,
      description: `余额: ${formatAmount(u.balance ?? 0)}`,
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPlans = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminPlans({
      query: { page, page_size: PAGE_SIZE, status: 1, keyword: keyword || undefined },
    })
    const plans = res?.data?.items ?? []
    setPlanMap((prev) => {
      const next = new Map(prev)
      for (const p of plans) next.set(p.id!, p)
      return next
    })
    const items = plans.map((p) => ({
      id: p.id!,
      label: p.name ?? "",
      description: `${p.cpu}C / ${p.memory! >= 1024 ? `${(p.memory! / 1024).toFixed(0)}G` : `${p.memory}M`} / ${p.disk}G`,
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])

  const fetchNodes = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminNodes({
      query: { page, page_size: PAGE_SIZE, status: 1, keyword: keyword || undefined },
    })
    const items = (res?.data?.items ?? []).map((n) => ({
      id: n.id!,
      label: `${n.name}${n.region_display_name ? ` (${n.region_display_name})` : ""}`,
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])

  const fetchImages = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminImages({
      query: { page, page_size: PAGE_SIZE, status: 1, keyword: keyword || undefined },
    })
    const items = (res?.data?.items ?? []).map((img) => ({
      id: img.id!,
      label: img.name ?? "",
      description: [img.os, img.version, img.arch].filter(Boolean).join(" "),
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])

  const fetchFreeIPs = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminIpsFree({
      query: { page, page_size: PAGE_SIZE, keyword: keyword || undefined },
    })
    const items = (res?.data?.items ?? []).map((ip) => ({
      id: ip.id!,
      label: ip.address ?? "",
      description: ip.pool_name,
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])

  const selectedPlan = planMap.get(form.watch("plan_id"))
  const billingCycle = form.watch("billing_cycle")
  const autoPay = form.watch("auto_pay")
  const firstPeriodFree = form.watch("first_period_free")
  const qty = form.watch("quantity") || 1
  const unitPrice = selectedPlan
    ? billingCycle === "hourly" ? (selectedPlan as Record<string, number>).price_hourly ?? 0
    : billingCycle === "yearly" ? selectedPlan.price_yearly
    : billingCycle === "quarterly" ? selectedPlan.price_quarterly
    : selectedPlan.price_monthly
    : 0
  const price = (unitPrice ?? 0) * qty

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    const fieldNames = ["user_id", "plan_id", "billing_cycle", "node_id", "image_id", "password", "hostname", "quantity", "ip_id", "first_period_free", "free_reason"] as const
    try {
      const { data: res } = await postAdminOrders({
        body: {
          user_id: values.user_id,
          plan_id: values.plan_id,
          billing_cycle: values.billing_cycle,
          node_id: values.node_id,
          image_id: values.image_id,
          password: values.password,
          hostname: values.hostname || undefined,
          quantity: values.quantity,
          ip_id: values.ip_id || undefined,
          auto_pay: values.first_period_free || values.auto_pay,
          first_period_free: values.first_period_free,
          free_reason: values.first_period_free ? values.free_reason : undefined,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      if (res.data?.status === "paid") {
        toast.success(values.first_period_free ? "首期免费订单已创建，实例开通中" : "订单已创建并支付，实例开通中")
      } else if (values.first_period_free || values.auto_pay) {
        toast.warning("订单已创建，但未完成开通，请在订单列表检查后重试")
      } else {
        toast.success("订单已创建，待支付")
      }
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setServerError("")
      setPlanMap(new Map())
      form.reset()
    }
    onOpenChange(v)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-lg flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>创建新购订单</SheetTitle>
          <SheetDescription>选择用户、套餐、节点和镜像，创建新购订单并开通实例</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
          <Form {...form}>
            <form id="create-order-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>用户</FormLabel>
                    <FormControl>
                      <PaginatedCombobox
                        value={field.value || undefined}
                        onChange={(v) => field.onChange(v ?? 0)}
                        fetchFn={fetchUsers}
                        placeholder="选择用户"
                        searchPlaceholder="搜索用户名/邮箱..."
                        emptyText="未找到匹配用户"
                        icon={User}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plan_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>套餐</FormLabel>
                      <FormControl>
                        <PaginatedCombobox
                          value={field.value || undefined}
                          onChange={(v) => field.onChange(v ?? 0)}
                          fetchFn={fetchPlans}
                          placeholder="选择套餐"
                          searchPlaceholder="搜索套餐名称..."
                          emptyText="未找到匹配套餐"
                          icon={Box}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billing_cycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>计费周期</FormLabel>
                      <Select onValueChange={(value) => { field.onChange(value); if (value === "hourly") form.setValue("first_period_free", false) }} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">时付</SelectItem>
                          <SelectItem value="monthly">月付</SelectItem>
                          <SelectItem value="quarterly">季付</SelectItem>
                          <SelectItem value="yearly">年付</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="node_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>节点</FormLabel>
                      <FormControl>
                        <PaginatedCombobox
                          value={field.value || undefined}
                          onChange={(v) => field.onChange(v ?? 0)}
                          fetchFn={fetchNodes}
                          placeholder="选择节点"
                          searchPlaceholder="搜索节点名称..."
                          emptyText="未找到匹配节点"
                          icon={Server}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>镜像</FormLabel>
                      <FormControl>
                        <PaginatedCombobox
                          value={field.value || undefined}
                          onChange={(v) => field.onChange(v ?? 0)}
                          fetchFn={fetchImages}
                          placeholder="选择镜像"
                          searchPlaceholder="搜索镜像名称..."
                          emptyText="未找到匹配镜像"
                          icon={MonitorCog}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>密码</FormLabel>
                      <FormControl><Input type="password" placeholder="实例登录密码" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hostname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主机名</FormLabel>
                      <FormControl><Input placeholder="可选" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数量</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ip_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP 地址（留空自动分配）</FormLabel>
                    <FormControl>
                      <PaginatedCombobox
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                        fetchFn={fetchFreeIPs}
                        placeholder="自动分配"
                        searchPlaceholder="搜索 IP 地址..."
                        emptyText="没有可用的空闲 IP"
                        icon={Globe}
                        clearable
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_period_free"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-4">
                      <FormLabel>首期免费</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          disabled={billingCycle === "hourly"}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <p className="text-xs text-muted-foreground">仅免除本次所选周期费用，后续按正常规则续费。小时计费不支持。</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {firstPeriodFree && (
                <FormField
                  control={form.control}
                  name="free_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>赠送原因</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={255} placeholder="例如：活动赠送、故障补偿" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">原因将显示在订单备注中。赠送期内暂不支持升降级，正常续费不受影响。</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {selectedPlan && (
                <div className="rounded-md border p-3 bg-muted/50 space-y-2">
                  {firstPeriodFree && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">套餐原价</span>
                        <span>{formatAmount(price)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">首期减免</span>
                        <span>{formatAmount(price)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">应付金额</span>
                    <span className="font-semibold text-lg">{formatAmount(firstPeriodFree ? 0 : price)}</span>
                  </div>
                </div>
              )}
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            </form>
          </Form>
        </div>
        <SheetFooter className="px-4 pb-4 flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            hidden={firstPeriodFree}
            disabled={form.formState.isSubmitting}
            onClick={() => {
              form.setValue("auto_pay", false)
              form.handleSubmit(onSubmit)()
            }}
          >
            {form.formState.isSubmitting && !autoPay ? "创建中..." : "仅创建订单"}
          </Button>
          <Button
            type="button"
            disabled={form.formState.isSubmitting}
            onClick={() => {
              form.setValue("auto_pay", true)
              form.handleSubmit(onSubmit)()
            }}
          >
            {form.formState.isSubmitting && autoPay ? "创建中..." : firstPeriodFree ? "免费开通" : "创建并支付"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
