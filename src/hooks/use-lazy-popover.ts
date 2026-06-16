import { useState, useCallback } from "react"

export function useLazyPopover<T>(
  id: number | undefined,
  fetchFn: (id: number) => Promise<{ data?: { data?: T | null } | null }>
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadedId, setLoadedId] = useState<number | undefined>()

  const handleOpen = useCallback(async (open: boolean) => {
    if (!open || loadedId === id || !id) return
    setData(null)
    setLoading(true)
    try {
      const { data: res } = await fetchFn(id)
      setData(res?.data ?? null)
    } catch { /* ignore */ }
    setLoading(false)
    setLoadedId(id)
  }, [id, loadedId, fetchFn])

  return { data, loading, handleOpen }
}
