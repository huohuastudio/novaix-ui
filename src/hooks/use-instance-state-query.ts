import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { ServiceInstanceStateInfo } from "@/api"

// 实例实时状态轮询的共享实现：admin/portal 两端仅注入的 SDK query options 工厂不同
// （缓存 key 由各自生成的 options 天然隔离），其余逻辑完全一致，合并于此。
// - 仅在实例存在且运行中时每 5 秒轮询（对应原实现：条件不满足时不请求并重置为 null）
// - 错误由 useQuery 静默保留旧数据，与原「忽略错误」行为一致
export function useInstanceStateQuery<
  TResp extends { data?: unknown },
  TError,
  TKey extends readonly unknown[],
>(
  instanceId: number | undefined,
  isRunning: boolean,
  getOptions: (opts: { path: { id: number } }) => UseQueryOptions<TResp, TError, TResp, TKey>,
): ServiceInstanceStateInfo | null {
  const enabled = !!instanceId && isRunning
  const query = useQuery({
    ...getOptions({ path: { id: instanceId ?? 0 } }),
    enabled,
    refetchInterval: enabled ? 5000 : false,
  })

  if (!enabled) return null
  return (query.data?.data as ServiceInstanceStateInfo | undefined) ?? null
}
