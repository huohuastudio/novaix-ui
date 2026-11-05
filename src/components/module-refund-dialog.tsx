import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { postAdminSupplierOrdersByIdRefund } from "@/api"
import {
  getAdminOrdersByIdQueryKey,
  getAdminOrdersQueryKey,
  getAdminSupplierOperationsAttentionQueryKey,
  getAdminSupplierOperationsQueryKey,
  getAdminSupplierServicesByIdQueryKey,
  getAdminSupplierServicesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { handleCatchError } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const schema = z.object({
  mode: z.enum(["refund", "terminate"]),
  remark: z.string().max(200, "备注不能超过 200 个字符").optional(),
})

type FormValues = z.infer<typeof schema>

const MODES = [
  {
    value: "refund",
    label: "仅退款",
    description: "立即将订单金额退回用户余额，上游服务保持不变，可稍后在服务详情中手动退订",
  },
  {
    value: "terminate",
    label: "退款并退订",
    description: "先向上游提交退订，上游确认退订成功后再自动退回余额",
  },
] as const

export interface ModuleRefundOrder {
  id?: number
  order_no?: string
  amount?: number
  module_service_id?: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ModuleRefundOrder | null
  onSuccess?: () => void
}

/** 模块商品（供应商转售）订单退款：可选择仅退款或退款并向上游退订 */
export function ModuleRefundDialog({ open, onOpenChange, order, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const formatAmount = useFormatAmount()
  const [serverError, setServerError] = useState("")
  // 关闭动画期间保留上一次的订单信息
  const [shown, setShown] = useState(order)
  if (order && order !== shown) setShown(order)
  const current = order ?? shown
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "refund", remark: "" },
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时重置表单状态
      setServerError("")
      form.reset({ mode: "refund", remark: "" })
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    if (!order?.id) return
    setServerError("")
    try {
      const { data: res } = await postAdminSupplierOrdersByIdRefund({
        path: { id: order.id },
        body: { terminate: values.mode === "terminate", remark: values.remark || undefined },
      })
      if (res?.code !== 0) {
        setServerError(res?.message ?? "退款失败")
        return
      }
      toast.success(res.data?.status === "pending_refund"
        ? "已提交退订，上游确认后自动退款到余额"
        : "退款成功")
      // 订单、服务与操作队列都可能变化
      queryClient.invalidateQueries({ queryKey: getAdminOrdersQueryKey() })
      queryClient.invalidateQueries({ queryKey: getAdminOrdersByIdQueryKey({ path: { id: order.id } }) })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierServicesQueryKey() })
      if (order.module_service_id) {
        queryClient.invalidateQueries({ queryKey: getAdminSupplierServicesByIdQueryKey({ path: { id: order.module_service_id } }) })
      }
      queryClient.invalidateQueries({ queryKey: getAdminSupplierOperationsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierOperationsAttentionQueryKey() })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setServerError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>退款</DialogTitle>
          <DialogDescription>
            将订单「{current?.order_no}」退款 {formatAmount(current?.amount)} 到用户余额
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>退款方式</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
                      {MODES.map((m) => (
                        <label
                          key={m.value}
                          className="flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                        >
                          <RadioGroupItem value={m.value} className="mt-0.5" disabled={m.value === "terminate" && !current?.module_service_id} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{m.label}</div>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>退款原因</FormLabel>
                  <FormControl><Textarea placeholder="请输入退款原因（可选）" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "提交中..." : "确认退款"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
