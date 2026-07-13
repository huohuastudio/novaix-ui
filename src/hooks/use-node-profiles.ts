import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { incus } from "@/lib/incus"
import { queryKeys } from "@/lib/query-keys"
import type { IncusProfile } from "@/types/incus"

export interface NodeProfiles {
  profiles: IncusProfile[]
  loading: boolean
  refetch: () => void
}

export function useNodeProfiles(nodeId: number | undefined): NodeProfiles {
  const queryClient = useQueryClient()

  // 节点配置文件列表走通用 proxy（lib/incus.ts，无生成 SDK）
  // nodeId 为空时禁用查询，切换节点时 key 变化自动隔离缓存（旧数据不会串显）
  const query = useQuery({
    queryKey: queryKeys.nodeProfiles(nodeId),
    queryFn: async () => {
      const result = await incus<IncusProfile[]>(nodeId!, "1.0/profiles", { params: { recursion: "1" } })
      return result ?? []
    },
    enabled: !!nodeId,
  })

  // 写操作成功后失效缓存触发重取（保持原对外签名不变）
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.nodeProfiles(nodeId) })
  }, [queryClient, nodeId])

  return {
    profiles: query.data ?? [],
    loading: query.isLoading,
    refetch,
  }
}
