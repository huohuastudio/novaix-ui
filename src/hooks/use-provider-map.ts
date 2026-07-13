import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAdminProvidersByKindOptions } from "@/api/@tanstack/react-query.gen"

export function useProviderMap(kind: string) {
  // 加载失败时保持空 map，与原「忽略错误」行为一致
  const query = useQuery(getAdminProvidersByKindOptions({ path: { kind } }))

  return useMemo(() => {
    const m: Record<string, string> = {}
    for (const d of query.data?.data ?? []) {
      if (d.name && d.title) m[d.name] = d.title
    }
    return m
  }, [query.data])
}
