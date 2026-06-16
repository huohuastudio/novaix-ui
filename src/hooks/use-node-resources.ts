import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { incus } from "@/lib/incus"
import type { IncusStoragePool, IncusNetwork, IncusProfile } from "@/types/incus"

export type { IncusStoragePool, IncusNetwork, IncusProfile }

export interface NodeResources {
  storagePools: IncusStoragePool[]
  networks: IncusNetwork[]
  profiles: IncusProfile[]
  loading: boolean
  error: boolean
}

export function useNodeResources(nodeId: number | undefined): NodeResources {
  const [storagePools, setStoragePools] = useState<IncusStoragePool[]>([])
  const [networks, setNetworks] = useState<IncusNetwork[]>([])
  const [profiles, setProfiles] = useState<IncusProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const fetchResources = useCallback((nid: number) => {
    setLoading(true)
    setError(false)
    setStoragePools([])
    setNetworks([])
    setProfiles([])

    let cancelled = false

    Promise.all([
      incus<IncusStoragePool[]>(nid, "1.0/storage-pools", { params: { recursion: "1" } }),
      incus<IncusNetwork[]>(nid, "1.0/networks", { params: { recursion: "1" } }),
      incus<IncusProfile[]>(nid, "1.0/profiles", { params: { recursion: "1" } }),
    ])
      .then(([pools, nets, profs]) => {
        if (cancelled) return
        setStoragePools(pools ?? [])
        setNetworks(nets ?? [])
        setProfiles(profs ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(true)
        toast.error(getErrorMessage(err, "获取节点资源失败"), { description: "请确认节点在线且已完成初始化" })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!nodeId) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据获取初始化
    return fetchResources(nodeId)
  }, [nodeId, fetchResources])

  return { storagePools, networks, profiles, loading, error }
}
