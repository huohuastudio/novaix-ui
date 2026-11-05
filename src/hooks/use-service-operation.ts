import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ServicePortalModuleService, ServicePortalServiceOperation } from "@/api"
import { getPortalServicesByIdOperationsByOpIdOptions } from "@/api/@tanstack/react-query.gen"

/**
 * 跟踪服务当前进行中的操作：
 * - 详情返回的 operation 处于 processing，或用户刚提交了操作时，按 3 秒轮询操作进度
 * - 操作由处理中变为完成/失败时 toast 提示并回调 onSettled（用于刷新详情）
 */
export function useServiceOperation(
  service: ServicePortalModuleService | null,
  labelOf: (op: ServicePortalServiceOperation) => string,
  onSettled: () => void,
) {
  const serviceId = service?.id ?? 0
  const current = service?.operation
  const [trackedOpId, setTrackedOpId] = useState<number | null>(null)
  // 记录观察到处于 processing 的操作，只对这些操作提示结果，避免进入页面时提示历史操作
  const seenProcessing = useRef(new Set<number>())

  const activeOpId = (current?.status === "processing" ? current.id : undefined) ?? trackedOpId ?? undefined

  const opQuery = useQuery({
    ...getPortalServicesByIdOperationsByOpIdOptions({ path: { id: serviceId, opId: activeOpId ?? 0 } }),
    enabled: !!serviceId && !!activeOpId,
    refetchInterval: (query) => (query.state.data?.data?.status === "processing" ? 3_000 : false),
  })

  const polled = opQuery.data?.data
  const op = polled?.id === activeOpId ? polled : current?.id === activeOpId ? current : undefined
  const processing = !!op && op.status === "processing"

  useEffect(() => {
    if (!polled?.id) return
    if (polled.status === "processing") {
      seenProcessing.current.add(polled.id)
      return
    }
    if (!seenProcessing.current.has(polled.id)) return
    seenProcessing.current.delete(polled.id)
    const label = labelOf(polled)
    if (polled.status === "succeeded") {
      toast.success(`${label}已完成`)
    } else {
      toast.error(`${label}未成功，请稍后重试或提交工单`)
    }
    onSettled()
  }, [polled, labelOf, onSettled])

  /** 提交操作后开始跟踪 */
  const track = useCallback((submitted: ServicePortalServiceOperation) => {
    if (!submitted.id) return
    if (submitted.status === "processing") seenProcessing.current.add(submitted.id)
    setTrackedOpId(submitted.id)
  }, [])

  return { operation: processing ? op : null, processing, track }
}
