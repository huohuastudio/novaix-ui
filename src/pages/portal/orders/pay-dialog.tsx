import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Wallet, CreditCard } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PaymentPending } from "@/components/payment-pending"
import {
  postPortalOrdersByIdPay,
  postPortalPayments,
} from "@/api"
import { getPortalPaymentMethodsOptions } from "@/api/@tanstack/react-query.gen"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { cn, getErrorMessage } from "@/lib/utils"
import { PaymentMethodGrid } from "@/components/payment-method-picker"

interface PayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  amount: number
  onSuccess?: () => void
}

export function PayDialog({ open, onOpenChange, orderId, amount, onSuccess }: PayDialogProps) {
  const formatAmount = useFormatAmount()
  const [payMode, setPayMode] = useState<"balance" | "online">("balance")
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [paymentResult, setPaymentResult] = useState<{
    paymentNo: string
    payURL: string
    qrCode: boolean
  } | null>(null)

  // 对话框打开时才加载支付方式
  const methodsQuery = useQuery({
    ...getPortalPaymentMethodsOptions(),
    enabled: open,
  })
  const methods = methodsQuery.data?.data ?? []
  const loadingMethods = methodsQuery.isPending

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 对话框打开时重置状态
    setPaymentResult(null)
    setPayMode("balance")
    setSelectedProvider("")
    setSelectedMethod("")
  }, [open])

  // 未手动选择时默认选中第一个支付方式（原逻辑在加载完成后 setState，这里改为派生）
  const effectiveProvider = selectedProvider || (methods[0]?.provider ?? "")
  const effectiveMethod = selectedProvider ? selectedMethod : (methods[0]?.method ?? "")

  const handleBalancePay = async () => {
    setSubmitting(true)
    try {
      const { data: res } = await postPortalOrdersByIdPay({ path: { id: orderId } })
      if (res?.code === 0) {
        toast.success("支付成功")
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(res?.message || "支付失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "支付失败"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleOnlinePay = async () => {
    if (!effectiveProvider) {
      toast.error("请选择支付方式")
      return
    }
    setSubmitting(true)
    try {
      const { data: res } = await postPortalPayments({
        body: {
          order_id: orderId,
          provider: effectiveProvider,
          method: effectiveMethod || undefined,
        },
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "创建支付失败")
        return
      }
      const data = res.data
      if (!data) return

      setPaymentResult({
        paymentNo: data.payment_no ?? "",
        payURL: data.pay_url ?? "",
        qrCode: !!data.qr_code,
      })
      if (!data.qr_code) {
        window.open(data.pay_url, "_blank", "noopener,noreferrer")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建支付失败"))
    } finally {
      setSubmitting(false)
    }
  }

  if (paymentResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle>等待支付</DialogTitle>
            <DialogDescription>
              {paymentResult.qrCode
                ? "请使用手机扫描二维码完成支付"
                : "已在新窗口打开支付页面，完成支付后将自动到账"}
            </DialogDescription>
          </DialogHeader>
          <PaymentPending
            paymentNo={paymentResult.paymentNo}
            payURL={paymentResult.payURL}
            qrCode={paymentResult.qrCode}
            amount={amount}
            onPaid={() => {
              onSuccess?.()
              onOpenChange(false)
            }}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>支付订单</DialogTitle>
          <DialogDescription>
            订单金额：{formatAmount(amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <Label>支付方式</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  payMode === "balance"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-accent"
                )}
                onClick={() => setPayMode("balance")}
              >
                <Wallet className="size-4" />
                余额支付
              </button>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  payMode === "online"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-accent",
                  methods.length === 0 && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => methods.length > 0 && setPayMode("online")}
                disabled={methods.length === 0}
              >
                <CreditCard className="size-4" />
                在线支付
              </button>
            </div>
          </div>

          {payMode === "online" && (
            <div className="space-y-3">
              <Label>选择支付方式</Label>
              {loadingMethods ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <PaymentMethodGrid
                  methods={methods}
                  selectedProvider={effectiveProvider}
                  selectedMethod={effectiveMethod}
                  onSelect={(p, m) => { setSelectedProvider(p); setSelectedMethod(m) }}
                />
              )}
            </div>
          )}

          <Button
            className="w-full"
            disabled={submitting || (payMode === "online" && !effectiveProvider)}
            onClick={payMode === "balance" ? handleBalancePay : handleOnlinePay}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                处理中...
              </>
            ) : payMode === "balance" ? (
              `余额支付 ${formatAmount(amount)}`
            ) : (
              `在线支付 ${formatAmount(amount)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
