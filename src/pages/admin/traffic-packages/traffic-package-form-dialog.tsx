import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  postAdminTrafficPackages,
  putAdminTrafficPackagesById,
  getAdminPlans,
} from "@/api"
import type { TrafficPackageTrafficPackageItem } from "@/api"
import { getAdminPlansOptions } from "@/api/@tanstack/react-query.gen"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { FormSheet } from "@/components/form-sheet"
import { PaginatedMultiSelect, type PaginatedMultiSelectItem } from "@/components/paginated-multi-select"
import { trafficPackageTypeMap } from "@/lib/traffic-package-constants"

const schema = z.object({
  name: z.string().min(1, "请输入名称").max(128),
  type: z.enum(["topup", "reset"]).default("topup"),
  traffic: z.coerce.number<number | string>().int().min(0).default(0),
  price: z.coerce.number<number | string>().int().min(1, "价格必须大于 0"),
  plan_ids: z.array(z.string()).default([]),
  status: z.string().default("1"),
  sort_order: z.coerce.number<number | string>().int().min(0).default(0),
}).refine((v) => v.type !== "topup" || v.traffic > 0, {
  message: "叠加包流量必须大于 0",
  path: ["traffic"],
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

const defaultValues: FormValues = {
  name: "",
  type: "topup",
  traffic: 0,
  price: 0,
  plan_ids: [],
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
  pkg?: TrafficPackageTrafficPackageItem
  onSuccess: () => void
}

const PAGE_SIZE = 20

export default function TrafficPackageFormDialog({ open, onOpenChange, pkg, onSuccess }: Props) {
  const isEdit = !!pkg
  const [serverError, setServerError] = useState("")

  // 编辑已有限定套餐时，拉取套餐列表用于回显名称；弹窗打开且存在关联套餐时才请求
  const editPlanIds = useMemo(() => parseIds(pkg?.plan_ids), [pkg?.plan_ids])
  const plansQuery = useQuery({
    ...getAdminPlansOptions({ query: { page: 1, page_size: 100 } }),
    enabled: open && editPlanIds.length > 0,
  })
  const initialPlanItems = useMemo<PaginatedMultiSelectItem[]>(() => {
    if (editPlanIds.length === 0) return []
    const plans = plansQuery.data?.data?.items ?? []
    const map = new Map(plans.map((p) => [String(p.id), p.name ?? `套餐 ${p.id}`]))
    return editPlanIds.map((id) => ({ id, label: map.get(id) ?? `套餐 ${id}` }))
  }, [editPlanIds, plansQuery.data])

  const fetchPlanOptions = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminPlans({
      query: { page, page_size: PAGE_SIZE, status: 1, keyword: keyword || undefined },
    })
    const plans = res?.data?.items ?? []
    const items = plans.map((p) => ({
      id: String(p.id),
      label: p.name ?? `套餐 ${p.id}`,
      description: [`${p.cpu}C`, `${p.memory}M`, `${p.disk}G`].join(" / "),
    }))
    return { items, hasMore: items.length >= PAGE_SIZE }
  }, [])

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const type = useWatch({ control: form.control, name: "type" })

  useEffect(() => {
    if (!open) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServerError("")

    if (pkg) {
      form.reset({
        name: pkg.name ?? "",
        type: (pkg.type as "topup" | "reset") ?? "topup",
        traffic: pkg.traffic ?? 0,
        price: pkg.price ?? 0,
        plan_ids: parseIds(pkg.plan_ids),
        status: String(pkg.status ?? 1),
        sort_order: pkg.sort_order ?? 0,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, pkg, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const body = {
        name: values.name,
        type: values.type,
        // 重置包不需要流量值，统一置 0
        traffic: values.type === "topup" ? values.traffic : 0,
        price: values.price,
        plan_ids: joinIds(values.plan_ids),
        status: Number(values.status),
        sort_order: values.sort_order,
      }

      const { data: res } = isEdit
        ? await putAdminTrafficPackagesById({ path: { id: pkg!.id! }, body })
        : await postAdminTrafficPackages({ body })

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
      title={isEdit ? "编辑流量包" : "添加流量包"}
      description={isEdit ? "修改流量包的类型和定价" : "创建一个新的流量包，供用户在云服务器内购买"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="traffic-package-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "提交中..." : isEdit ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="traffic-package-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <section>
            <h3 className="text-sm font-medium">基础信息</h3>
            <p className="text-xs text-muted-foreground mt-1">流量包名称与类型</p>
            <div className="mt-4 flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>名称</FormLabel>
                    <FormControl><Input placeholder="叠加流量包 100GB" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>类型</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="topup">{trafficPackageTypeMap.topup}</SelectItem>
                          <SelectItem value="reset">{trafficPackageTypeMap.reset}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {type === "topup" ? "增加当期流量额度，用完即止" : "清零当月已用流量，一次性消耗"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {type === "topup" && (
                  <FormField
                    control={form.control}
                    name="traffic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>流量 (GB)</FormLabel>
                        <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium">定价与销售</h3>
            <p className="text-xs text-muted-foreground mt-1">价格单位为分（如 1000 = ¥10.00）</p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 items-start">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>价格 (分)</FormLabel>
                      <FormControl><Input type="number" placeholder="1000" {...field} /></FormControl>
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
                          <SelectItem value="1">启用</SelectItem>
                          <SelectItem value="0">禁用</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="plan_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>限定套餐</FormLabel>
                    <FormControl>
                      <PaginatedMultiSelect
                        value={field.value ?? []}
                        onChange={field.onChange}
                        fetchFn={fetchPlanOptions}
                        initialItems={initialPlanItems}
                        placeholder="全部套餐可用"
                        searchPlaceholder="搜索套餐..."
                        emptyText="无可用套餐"
                      />
                    </FormControl>
                    <FormDescription>不选择则所有套餐的云服务器均可购买此流量包</FormDescription>
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
