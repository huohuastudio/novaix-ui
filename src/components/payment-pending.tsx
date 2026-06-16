import { useEffect, useState } from "react"
import { Loader2, QrCode } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getPortalPaymentsByPaymentNo } from "@/api"
import { useFormatAmount } from "@/hooks/use-site-settings"

interface PaymentPendingProps {
  paymentNo: string
  payURL: string
  qrCode: boolean
  amount: number
  onPaid: () => void
}

export function PaymentPending({ paymentNo, payURL, qrCode, amount, onPaid }: PaymentPendingProps) {
  const formatAmount = useFormatAmount()
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    if (!polling) return
    let retries = 0
    const maxRetries = 100
    const timer = setInterval(async () => {
      if (++retries > maxRetries) {
        setPolling(false)
        toast.error("等待支付超时，请刷新页面查看状态")
        return
      }
      try {
        const { data: res } = await getPortalPaymentsByPaymentNo({
          path: { paymentNo },
        })
        if (res?.data?.status === "paid") {
          setPolling(false)
          toast.success("支付成功")
          onPaid()
        }
      } catch {
        // 忽略轮询错误
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [polling, paymentNo, onPaid])

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {qrCode ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border p-4 bg-white">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payURL)}`}
              alt="支付二维码"
              className="size-48"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <QrCode className="size-4" />
            <span>扫码支付 {formatAmount(amount)}</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground">
          <p>支付金额：{formatAmount(amount)}</p>
          <p className="mt-2">如果支付页面未自动打开，请点击下方按钮</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => window.open(payURL, "_blank", "noopener,noreferrer")}
          >
            打开支付页面
          </Button>
        </div>
      )}

      {polling && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          <span>正在等待支付结果...</span>
        </div>
      )}
    </div>
  )
}
