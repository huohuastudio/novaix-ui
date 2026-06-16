import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { postAdminOrdersByIdRefund } from "@/api"
import type { OrderOrderItem, OrderOrderDetail } from "@/api"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { handleCatchError } from "@/lib/form-utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const schema = z.object({
  remark: z.string().max(255).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Pick<OrderOrderItem, "id" | "order_no" | "amount"> | OrderOrderDetail | null
  onSuccess: () => void
}

export function RefundDialog({ open, onOpenChange, order, onSuccess }: Props) {
  const formatAmount = useFormatAmount()
  const [serverError, setServerError] = useState("")
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { remark: "" },
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({ remark: "" })
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    if (!order) return
    setServerError("")
    try {
      const { data: res } = await postAdminOrdersByIdRefund({
        path: { id: order.id! },
        body: { remark: values.remark || undefined },
      })
      if (res?.code !== 0) {
        setServerError(res?.message ?? "退款失败")
        return
      }
      toast.success("退款成功")
      onSuccess()
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
            将订单「{order?.order_no}」退款 {formatAmount(order?.amount)} 到用户余额
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              <Button
                type="submit"
                variant="destructive"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "退款中..." : "确认退款"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
