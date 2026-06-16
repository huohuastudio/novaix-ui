import { useCallback, useEffect, useRef, useState } from "react"
import { getPortalInstancesByIdState } from "@/api"
import type { ServiceInstanceStateInfo } from "@/api"

export function usePortalInstanceState(instanceId: number | undefined, isRunning: boolean) {
  const [state, setState] = useState<ServiceInstanceStateInfo | null>(null)
  const prev = useRef<string | null>(null)

  const reset = useCallback(() => {
    setState(null)
    prev.current = null
  }, [])

  useEffect(() => {
    if (!instanceId || !isRunning) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 条件不满足时重置状态
      reset()
      return
    }
    let cancelled = false
    const poll = async () => {
      try {
        const { data: res } = await getPortalInstancesByIdState({ path: { id: instanceId } })
        if (!cancelled && res?.code === 0 && res.data) {
          const json = JSON.stringify(res.data)
          if (json !== prev.current) {
            prev.current = json
            setState(res.data as ServiceInstanceStateInfo)
          }
        }
      } catch {
        // ignore
      }
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [instanceId, isRunning, reset])

  return state
}
