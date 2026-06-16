import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { postAdminUsersByIdRecharge, postAdminUsersByIdAdjustBalance } from "@/api"
import type { UserUserItem } from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"

const rechargeSchema = z.object({
  amount: z.coerce.number().min(0.01, "金额必须大于 0"),
  remark: z.string().max(255).optional(),
})

type RechargeFormValues = z.infer<typeof rechargeSchema>

interface RechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserUserItem | null
  onSuccess: () => void
}

export function RechargeDialog({ open, onOpenChange, user, onSuccess }: RechargeDialogProps) {
  const formatAmount = useFormatAmount()
  const [serverError, setServerError] = useState("")
  const form = useForm<RechargeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(rechargeSchema) as any,
    defaultValues: { amount: 0, remark: "" },
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({ amount: 0, remark: "" })
    }
  }, [open, form])

  const onSubmit = async (values: RechargeFormValues) => {
    if (!user) return
    setServerError("")
    const fieldNames = ["amount", "remark"] as const
    try {
      const { data: res } = await postAdminUsersByIdRecharge({
        path: { id: user.id! },
        body: {
          amount: Math.round(values.amount * 100),
          remark: values.remark,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      toast.success("充值成功")
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>用户充值</DialogTitle>
          <DialogDescription>
            为用户「{user?.username}」充值，当前余额 {formatAmount(user?.balance ?? 0)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>充值金额（元）</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0.01" placeholder="100.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl><Textarea placeholder="管理员充值" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "充值中..." : "确认充值"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const adjustSchema = z.object({
  amount: z.coerce.number().refine(v => v !== 0, "金额不能为 0"),
  remark: z.string().min(1, "请填写备注").max(255),
})

type AdjustFormValues = z.infer<typeof adjustSchema>

interface AdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserUserItem | null
  onSuccess: () => void
}

export function AdjustBalanceDialog({ open, onOpenChange, user, onSuccess }: AdjustDialogProps) {
  const formatAmount = useFormatAmount()
  const [serverError, setServerError] = useState("")
  const form = useForm<AdjustFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(adjustSchema) as any,
    defaultValues: { amount: 0, remark: "" },
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({ amount: 0, remark: "" })
    }
  }, [open, form])

  const onSubmit = async (values: AdjustFormValues) => {
    if (!user) return
    setServerError("")
    const fieldNames = ["amount", "remark"] as const
    try {
      const { data: res } = await postAdminUsersByIdAdjustBalance({
        path: { id: user.id! },
        body: {
          amount: Math.round(values.amount * 100),
          remark: values.remark!,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, { setError: form.setError, setServerError, fieldNames })
        return
      }
      toast.success("调账成功")
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>调整余额</DialogTitle>
          <DialogDescription>
            调整用户「{user?.username}」的余额，当前 {formatAmount(user?.balance ?? 0)}。正数为增加，负数为扣减。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>调整金额（元）</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="-50.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>备注</FormLabel>
                  <FormControl><Textarea placeholder="扣除违规费用" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "处理中..." : "确认调账"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
