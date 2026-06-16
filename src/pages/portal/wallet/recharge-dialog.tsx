import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PaymentPending } from "@/components/payment-pending"
import { getPortalPaymentMethods, postPortalPayments } from "@/api"
import type { PortalPaymentMethodItem } from "@/api"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { cn, getErrorMessage } from "@/lib/utils"
import { PaymentMethodGrid } from "@/components/payment-method-picker"

const presetAmounts = [1000, 5000, 10000, 50000, 100000]

export function RechargeDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const formatAmount = useFormatAmount()
  const [methods, setMethods] = useState<PortalPaymentMethodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("")
  const [amount, setAmount] = useState<number>(0)
  const [customAmount, setCustomAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [paymentResult, setPaymentResult] = useState<{
    paymentNo: string
    payURL: string
    qrCode: boolean
  } | null>(null)
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 对话框打开时重置状态
    setLoading(true)
    setPaymentResult(null)
    setAmount(0)
    setCustomAmount("")
    getPortalPaymentMethods()
      .then(({ data: res }) => {
        const items = res?.data ?? []
        setMethods(items)
        if (items.length > 0) {
          setSelectedProvider(items[0].provider ?? "")
          setSelectedMethod(items[0].method ?? "")
        }
      })
      .finally(() => setLoading(false))
  }, [open])

  const effectiveAmount = customAmount ? Math.round(parseFloat(customAmount) * 100) : amount

  const handleSubmit = async () => {
    if (effectiveAmount <= 0) {
      toast.error("请选择或输入充值金额")
      return
    }
    if (!selectedProvider) {
      toast.error("请选择支付方式")
      return
    }

    setSubmitting(true)
    try {
      const { data: res } = await postPortalPayments({
        body: {
          amount: effectiveAmount,
          provider: selectedProvider,
          method: selectedMethod || undefined,
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
            amount={effectiveAmount}
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
          <DialogTitle>充值</DialogTitle>
          <DialogDescription>选择金额和支付方式进行充值</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : methods.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            暂无可用支付方式，请联系管理员
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <Label>充值金额</Label>
              <div className="grid grid-cols-3 gap-2">
                {presetAmounts.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      amount === a && !customAmount
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-accent"
                    )}
                    onClick={() => {
                      setAmount(a)
                      setCustomAmount("")
                    }}
                  >
                    {formatAmount(a)}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="自定义金额（元）"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value)
                    setAmount(0)
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>支付方式</Label>
              <PaymentMethodGrid
                methods={methods}
                selectedProvider={selectedProvider}
                selectedMethod={selectedMethod}
                onSelect={(p, m) => { setSelectedProvider(p); setSelectedMethod(m) }}
              />
            </div>

            <Button
              className="w-full"
              disabled={submitting || effectiveAmount <= 0}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  创建支付中...
                </>
              ) : (
                `充值 ${effectiveAmount > 0 ? formatAmount(effectiveAmount) : ""}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
