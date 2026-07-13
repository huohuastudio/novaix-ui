import type { UseFormSetError, FieldValues, Path } from "react-hook-form"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

export interface ServerResponse {
  code?: number
  message?: string
  data?: unknown
}

// 从 SDK 调用结果中解包服务端响应体。
// SDK 请求失败时（HTTP 非 2xx），error 字段同为响应体结构（code/message/data），
// 因此成功与失败的返回可以统一按响应体处理。泛型 R 从 SDK 返回值推导，
// 保留 data 字段的精确类型，下游无需再断言。
export function unwrapResponse<R extends ServerResponse>(result: { data?: R; error?: unknown }): R | undefined {
  return result.data ?? (result.error as R | undefined)
}

function getResponseData(err: unknown): ServerResponse | undefined {
  if (err && typeof err === "object" && "response" in err) {
    return (err as { response?: { data?: ServerResponse } }).response?.data as ServerResponse | undefined
  }
  return undefined
}

function showError(msg: string, setServerError?: (msg: string) => void) {
  if (setServerError) {
    setServerError(msg)
  } else {
    toast.error(msg)
  }
}

export function handleCatchError<T extends FieldValues>(
  err: unknown,
  fallback: string,
  opts?: {
    setError?: UseFormSetError<T>
    setServerError?: (msg: string) => void
    fieldNames?: readonly string[]
  },
) {
  const res = getResponseData(err)
  if (res && opts?.setError && opts.fieldNames?.length) {
    handleServerErrors<T>(res, {
      setError: opts.setError,
      setServerError: opts.setServerError,
      fieldNames: opts.fieldNames,
    })
  } else {
    showError(getErrorMessage(err, fallback), opts?.setServerError)
  }
}

export function handleServerErrors<T extends FieldValues>(
  res: ServerResponse | undefined,
  opts: {
    setError: UseFormSetError<T>
    setServerError?: (msg: string) => void
    fieldNames: readonly string[]
  },
) {
  const data = res?.data as Record<string, string> | undefined
  if (data && typeof data === "object") {
    const errors = Object.entries(data)
    let hasFieldError = false
    for (const [field, msg] of errors) {
      if (opts.fieldNames.includes(field)) {
        opts.setError(field as Path<T>, { message: msg })
        hasFieldError = true
      }
    }
    if (hasFieldError) {
      const summary = errors.map(([, msg]) => msg).join("；")
      toast.error("表单验证失败", { description: summary })
    } else {
      showError(res?.message ?? "操作失败", opts.setServerError)
    }
  } else {
    showError(res?.message ?? "操作失败", opts.setServerError)
  }
}
