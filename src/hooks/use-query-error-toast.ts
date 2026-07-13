import { useEffect } from "react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

// 查询加载失败时弹出 toast 提示（错误对象变化才触发一次；后台静默刷新失败同样提示）。
// 走 incus proxy 的查询可传入 incusErrorMessage 作为自定义格式化函数。
export function useQueryErrorToast(
  error: unknown,
  fallback: string,
  format: (err: unknown, fallback: string) => string = getErrorMessage,
) {
  useEffect(() => {
    if (error) toast.error(format(error, fallback))
  }, [error, fallback, format])
}
