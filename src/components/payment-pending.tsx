import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, QrCode } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getPortalPaymentsByPaymentNoOptions } from "@/api/@tanstack/react-query.gen"
import { useFormatAmount } from "@/hooks/use-site-settings"

interface PaymentPendingProps {
  paymentNo: string
  payURL: string
  qrCode: boolean
  amount: number
  onPaid: () => void
}

// 轮询间隔 3 秒，超时 5 分钟（对应原实现 100 次 × 3 秒）
const POLL_INTERVAL = 3_000
const POLL_TIMEOUT = 300_000

// 支付终态：到达后停止轮询（与后端 payment 状态集一致）
const TERMINAL_STATUSES = ["paid", "failed", "expired", "cancelled"]

export function PaymentPending({ paymentNo, payURL, qrCode, amount, onPaid }: PaymentPendingProps) {
  const formatAmount = useFormatAmount()
  const [timedOut, setTimedOut] = useState(false)

  // paymentNo 通过 options 参数进入 queryKey
  const query = useQuery({
    ...getPortalPaymentsByPaymentNoOptions({ path: { paymentNo } }),
    // 条件轮询：到达终态或超时后停止，其余情况每 3 秒查询一次
    refetchInterval: (q) => {
      const status = q.state.data?.data?.status
      if (status && TERMINAL_STATUSES.includes(status)) return false
      if (timedOut) return false
      return POLL_INTERVAL
    },
  })

  const status = query.data?.data?.status
  const isTerminal = status != null && TERMINAL_STATUSES.includes(status)

  // 支付成功后触发回调（只触发一次），保持原行为
  const paidHandledRef = useRef(false)
  useEffect(() => {
    if (status === "paid" && !paidHandledRef.current) {
      paidHandledRef.current = true
      toast.success("支付成功")
      onPaid()
    }
  }, [status, onPaid])

  // 超时提示：到达终态前若超过 5 分钟仍未有结果，停止等待并提示
  useEffect(() => {
    if (isTerminal) return
    const timer = setTimeout(() => {
      setTimedOut(true)
      toast.error("等待支付超时，请刷新页面查看状态")
    }, POLL_TIMEOUT)
    return () => clearTimeout(timer)
  }, [isTerminal])

  const polling = !isTerminal && !timedOut

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
