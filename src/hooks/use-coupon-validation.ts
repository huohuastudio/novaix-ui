import { useState } from "react"
import { toast } from "sonner"
import { postPortalCouponsValidate } from "@/api"
import { getErrorMessage } from "@/lib/utils"

interface CouponResult {
  coupon_id?: number
  discount_amount?: number
}

/**
 * 优惠券验证 hook，管理优惠码输入、验证状态和验证结果
 */
export function useCouponValidation() {
  const [code, setCode] = useState("")
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<CouponResult | null>(null)

  /** 更新优惠码（同时清除上次验证结果） */
  const updateCode = (value: string) => {
    setCode(value)
    setResult(null)
  }

  /** 重置所有状态 */
  const reset = () => {
    setCode("")
    setResult(null)
  }

  /** 验证优惠码 */
  const validate = async (amount: number, orderType: string) => {
    if (!code.trim()) return
    setValidating(true)
    setResult(null)
    try {
      const { data: res } = await postPortalCouponsValidate({
        body: { code: code.trim(), amount, order_type: orderType },
      })
      if (res?.code === 0 && res.data) {
        setResult({ coupon_id: res.data.coupon_id, discount_amount: res.data.discount_amount })
        toast.success("优惠码验证成功")
      } else {
        toast.error(res?.message || "优惠码无效")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "验证失败"))
    } finally {
      setValidating(false)
    }
  }

  return { code, updateCode, validating, result, setResult, validate, reset }
}
