import { client } from "@/api/client.gen"
import { AxiosError } from "axios"

export interface IncusResponse<T = unknown> {
  type: string
  status: string
  status_code: number
  operation: string
  error_code: number
  error: string
  metadata: T
}

export class IncusError extends Error {
  errorCode: number

  constructor(message: string, errorCode: number) {
    super(message)
    this.name = "IncusError"
    this.errorCode = errorCode
  }
}

function extractError(data: unknown): IncusError | null {
  if (data == null || typeof data !== "object") return null
  const resp = data as IncusResponse
  if (resp.type === "error" && resp.error) {
    return new IncusError(resp.error, resp.error_code)
  }
  return null
}

export function incusErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof IncusError) return err.message
  return fallback
}

export async function incus<T = unknown>(
  nodeId: number,
  path: string,
  options?: {
    method?: string
    body?: unknown
    params?: Record<string, string>
  },
): Promise<T> {
  const method = options?.method ?? "GET"
  const url = `/admin/nodes/${nodeId}/proxy/${path}`

  const searchParams = new URLSearchParams(options?.params)
  const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url

  let resp
  try {
    resp = await client.instance.request<IncusResponse<T>>({
      method,
      url: fullUrl,
      data: options?.body,
    })
  } catch (err) {
    const axiosErr = err as AxiosError
    const incusErr = extractError(axiosErr.response?.data)
    if (incusErr) throw incusErr
    throw err
  }

  const incusErr = extractError(resp.data)
  if (incusErr) throw incusErr

  return resp.data.metadata
}
