import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { incus } from "@/lib/incus"
import { queryKeys } from "@/lib/query-keys"
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
  // 聚合存储池/网络/配置模板三个 proxy 调用为单个查询（走 lib/incus.ts 通配 proxy，无生成 SDK）
  // nodeId 为空时禁用查询，切换节点时 key 变化自动隔离缓存
  const query = useQuery({
    queryKey: queryKeys.nodeResources(nodeId),
    queryFn: async () => {
      const [pools, nets, profs] = await Promise.all([
        incus<IncusStoragePool[]>(nodeId!, "1.0/storage-pools", { params: { recursion: "1" } }),
        incus<IncusNetwork[]>(nodeId!, "1.0/networks", { params: { recursion: "1" } }),
        incus<IncusProfile[]>(nodeId!, "1.0/profiles", { params: { recursion: "1" } }),
      ])
      return {
        storagePools: pools ?? [],
        networks: nets ?? [],
        profiles: profs ?? [],
      }
    },
    enabled: !!nodeId,
  })

  // 与原实现一致：任一请求失败时 toast 提示
  useEffect(() => {
    if (query.error) {
      toast.error(getErrorMessage(query.error, "获取节点资源失败"), { description: "请确认节点在线且已完成初始化" })
    }
  }, [query.error])

  return {
    storagePools: query.data?.storagePools ?? [],
    networks: query.data?.networks ?? [],
    profiles: query.data?.profiles ?? [],
    loading: query.isLoading,
    error: query.isError,
  }
}
