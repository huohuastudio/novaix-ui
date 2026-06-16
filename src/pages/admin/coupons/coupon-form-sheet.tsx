import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminCoupons, putAdminCouponsById } from "@/api"
import type { CouponCouponItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const formSchema = z.object({
  code: z.string().min(1, "优惠码不能为空").max(64, "优惠码不能超过 64 个字符"),
  type: z.enum(["fixed", "percent"]),
  value: z.coerce.number().min(1, "面值必须大于 0"),
  min_order_amount: z.coerce.number().min(0).default(0),
  max_discount: z.coerce.number().min(0).default(0),
  usage_limit: z.coerce.number().int().min(0).default(0),
  per_user_limit: z.coerce.number().int().min(0).default(1),
  applicable_types: z.string().default(""),
  enabled: z.boolean().default(true),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  code: "",
  type: "fixed",
  value: 0,
  min_order_amount: 0,
  max_discount: 0,
  usage_limit: 0,
  per_user_limit: 1,
  applicable_types: "",
  enabled: true,
  starts_at: undefined,
  expires_at: undefined,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function CouponFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  const couponType = form.watch("type")

  return (
    <>
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>优惠码</FormLabel>
            <FormControl>
              <Input placeholder="例如 WELCOME50" className="font-mono uppercase" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
            </FormControl>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="fixed">固定金额</SelectItem>
                  <SelectItem value="percent">百分比</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>面值</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder={couponType === "fixed" ? "单位：分" : "单位：基点（5000=50%）"}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                {couponType === "fixed" ? "单位：分（100 = ¥1.00）" : "单位：基点（5000 = 50%）"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="min_order_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>最低订单金额</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="0 表示不限" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormDescription>单位：分，0 表示不限</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="max_discount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>最大折扣金额</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="0 表示不限" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormDescription>单位：分，0 表示不限</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="usage_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>总使用次数</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="0 表示不限" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="per_user_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>每人使用次数</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="0 表示不限" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="applicable_types"
        render={({ field }) => (
          <FormItem>
            <FormLabel>适用订单类型</FormLabel>
            <Select onValueChange={(v) => field.onChange(v === "all" ? "" : v)} value={field.value || "all"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="new">仅新购</SelectItem>
                <SelectItem value="renew">仅续费</SelectItem>
                <SelectItem value="new,renew">新购和续费</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="starts_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>生效时间</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>过期时间</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="enabled"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-md border p-3">
            <div>
              <FormLabel>启用</FormLabel>
              <FormDescription>启用后用户可使用此优惠券</FormDescription>
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

function datetimeLocalToServer(val?: string): string | undefined {
  if (!val) return undefined
  return val.replace("T", " ") + ":00"
}

function serverToDatetimeLocal(val?: string | null): string | undefined {
  if (!val) return undefined
  return val.slice(0, 16).replace(" ", "T")
}

export function CouponCreateSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset(defaultValues)
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await postAdminCoupons({
        body: {
          ...values,
          starts_at: datetimeLocalToServer(values.starts_at),
          expires_at: datetimeLocalToServer(values.expires_at),
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames,
        })
        return
      }
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
      title="创建优惠券"
      description="创建一张新的优惠券"
      footer={
        <Button form="coupon-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "创建中..." : "创建"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="coupon-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <CouponFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function CouponEditSheet({
  open,
  onOpenChange,
  coupon,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coupon: CouponCouponItem
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({
        code: coupon.code ?? "",
        type: (coupon.type as "fixed" | "percent") ?? "fixed",
        value: coupon.value ?? 0,
        min_order_amount: coupon.min_order_amount ?? 0,
        max_discount: coupon.max_discount ?? 0,
        usage_limit: coupon.usage_limit ?? 0,
        per_user_limit: coupon.per_user_limit ?? 1,
        applicable_types: coupon.applicable_types ?? "",
        enabled: coupon.enabled ?? true,
        starts_at: serverToDatetimeLocal(coupon.starts_at),
        expires_at: serverToDatetimeLocal(coupon.expires_at),
      })
    }
  }, [open, coupon, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminCouponsById({
        path: { id: coupon.id! },
        body: {
          ...values,
          starts_at: datetimeLocalToServer(values.starts_at),
          expires_at: datetimeLocalToServer(values.expires_at),
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames,
        })
        return
      }
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
      title="编辑优惠券"
      description="修改优惠券信息"
      footer={
        <Button form="coupon-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="coupon-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <CouponFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
