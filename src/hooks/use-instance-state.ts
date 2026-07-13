import { getAdminInstancesByIdStateOptions } from "@/api/@tanstack/react-query.gen"
import { useInstanceStateQuery } from "@/hooks/use-instance-state-query"

// 管理端实例实时状态轮询：薄包装，共享逻辑见 use-instance-state-query.ts
export function useInstanceState(instanceId: number | undefined, isRunning: boolean) {
  return useInstanceStateQuery(instanceId, isRunning, getAdminInstancesByIdStateOptions)
}
