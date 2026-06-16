import { useEffect, useState } from "react"
import { getAdminProvidersByKind } from "@/api"

export function useProviderMap(kind: string) {
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    void (async () => {
      try {
        const { data: res } = await getAdminProvidersByKind({ path: { kind } })
        if (res?.code === 0 && res.data) {
          const m: Record<string, string> = {}
          for (const d of res.data) {
            if (d.name && d.title) m[d.name] = d.title
          }
          setMap(m)
        }
      } catch {
        /* ignore */
      }
    })()
  }, [kind])
  return map
}
