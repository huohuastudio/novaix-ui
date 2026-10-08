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
import { getPortalPaymentMethodsOptions, getPortalProfileOptions } from "@/api/@tanstack/react-query.gen"
import { Link } from "react-router-dom"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { cn, getErrorMessage, getErrorCode } from "@/lib/utils"
import { PaymentMethodGrid } from "@/components/payment-method-picker"
import { calculateFee, formatFeePercent } from "@/lib/payment"

const ORDER_AMOUNT_CHANGED_CODE = 21210

interface PayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  amount: number
  onSuccess?: () => void
  onAmountChanged?: () => void
}

export function PayDialog({ open, onOpenChange, orderId, amount, onSuccess, onAmountChanged }: PayDialogProps) {
  const formatAmount = useFormatAmount()
  // null 表示用户尚未手动选择，此时按余额是否充足自动决定
  const [payMode, setPayMode] = useState<"balance" | "online" | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [paymentResult, setPaymentResult] = useState<{
    paymentNo: string
    payURL: string
    qrCode: boolean
    amount: number
  } | null>(null)

  // 对话框打开时才加载支付方式
  const methodsQuery = useQuery({
    ...getPortalPaymentMethodsOptions(),
    enabled: open,
  })
  const methods = methodsQuery.data?.data ?? []
  const loadingMethods = methodsQuery.isPending

  // 当前余额：用于提示余额不足，避免用户点击后才被拒绝
  const profileQuery = useQuery({ ...getPortalProfileOptions(), enabled: open })
  const balance = profileQuery.data?.data?.balance
  const balanceShort = balance !== undefined && balance < amount

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 对话框打开时重置状态
    setPaymentResult(null)
    setPayMode(null)
    setSelectedProvider("")
    setSelectedMethod("")
  }, [open])

  const effectivePayMode = payMode ?? (balanceShort && methods.length > 0 ? "online" : "balance")

  // 未手动选择时默认选中第一个支付方式（原逻辑在加载完成后 setState，这里改为派生）
  const effectiveProvider = selectedProvider || (methods[0]?.provider ?? "")
  const effectiveMethod = selectedProvider ? selectedMethod : (methods[0]?.method ?? "")
  const selectedMethodObj = methods.find(
    (m) => (m.provider ?? "") === effectiveProvider && (m.method ?? "") === effectiveMethod
  )
  const fee = effectivePayMode === "online" ? calculateFee(selectedMethodObj, amount) : 0
  const totalAmount = amount + fee

  const handleBalancePay = async () => {
    setSubmitting(true)
    try {
      const { data: res } = await postPortalOrdersByIdPay({ path: { id: orderId } })
      if (res?.code === 0) {
        toast.success("支付成功")
        onSuccess?.()
        onOpenChange(false)
      } else if (res?.code === ORDER_AMOUNT_CHANGED_CODE) {
        toast.warning(res.message || "订单金额已变更，请确认后重新支付")
        onAmountChanged?.()
        onOpenChange(false)
      } else {
        toast.error(res?.message || "支付失败")
      }
    } catch (err) {
      if (getErrorCode(err) === ORDER_AMOUNT_CHANGED_CODE) {
        toast.warning(getErrorMessage(err, "订单金额已变更，请确认后重新支付"))
        onAmountChanged?.()
        onOpenChange(false)
      } else {
        toast.error(getErrorMessage(err, "支付失败"))
      }
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
        amount: data.amount ?? amount,
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
            amount={paymentResult.amount}
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
                  effectivePayMode === "balance"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-accent"
                )}
                onClick={() => setPayMode("balance")}
              >
                <Wallet className="size-4" />
                余额支付
                {balance !== undefined && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">{formatAmount(balance)}</span>
                )}
              </button>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  effectivePayMode === "online"
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
            {effectivePayMode === "balance" && balanceShort && (
              <p className="text-xs text-destructive">
                余额不足，还差 {formatAmount(amount - (balance ?? 0))}，
                <Link to="/portal/wallet" className="underline underline-offset-2" onClick={() => onOpenChange(false)}>去充值</Link>
              </p>
            )}
            {!loadingMethods && methods.length === 0 && (
              <p className="text-xs text-muted-foreground">本站暂未开通在线支付</p>
            )}
          </div>

          {effectivePayMode === "online" && (
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

          {effectivePayMode === "online" && fee > 0 && (
            <div className="rounded-md border border-dashed p-3 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>订单金额</span>
                <span>{formatAmount(amount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>手续费{selectedMethodObj?.fee_type === "percent" ? `（${formatFeePercent(selectedMethodObj.fee_amount ?? 0)}）` : ""}</span>
                <span>+{formatAmount(fee)}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>实付金额</span>
                <span>{formatAmount(totalAmount)}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={submitting || (effectivePayMode === "online" && !effectiveProvider) || (effectivePayMode === "balance" && balanceShort)}
            onClick={effectivePayMode === "balance" ? handleBalancePay : handleOnlinePay}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                处理中...
              </>
            ) : effectivePayMode === "balance" ? (
              `余额支付 ${formatAmount(amount)}`
            ) : (
              `在线支付 ${formatAmount(fee > 0 ? totalAmount : amount)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
