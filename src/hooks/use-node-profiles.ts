import { useCallback, useEffect, useState } from "react"
import { incus } from "@/lib/incus"
import type { IncusProfile } from "@/types/incus"

export interface NodeProfiles {
  profiles: IncusProfile[]
  loading: boolean
  refetch: () => void
}

export function useNodeProfiles(nodeId: number | undefined): NodeProfiles {
  const [profiles, setProfiles] = useState<IncusProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  const resetProfiles = useCallback(() => {
    setProfiles([])
  }, [])

  const fetchProfiles = useCallback((nid: number) => {
    setLoading(true)
    setProfiles([])

    let cancelled = false

    incus<IncusProfile[]>(nid, "1.0/profiles", { params: { recursion: "1" } })
      .then((result) => {
        if (cancelled) return
        setProfiles(result ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!nodeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 条件分支中重置状态是合理的
      resetProfiles()
      return
    }

    return fetchProfiles(nodeId)
  }, [nodeId, version, fetchProfiles, resetProfiles])

  return { profiles, loading, refetch }
}
