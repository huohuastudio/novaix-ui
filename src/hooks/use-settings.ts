import { useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { putAdminSettingsByGroup } from "@/api"
import type { GetAdminSettingsByGroupResponse } from "@/api"
import {
  getAdminSettingsByGroupOptions,
  getAdminSettingsByGroupQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"

export function useSettings(group: string) {
  const queryClient = useQueryClient()
  // 服务端数据走 useQuery 缓存，本地编辑以 overrides 覆盖层叠加，保持 data/update 原有语义
  const query = useQuery(getAdminSettingsByGroupOptions({ path: { group } }))
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useQueryErrorToast(query.error, "加载设置失败")

  const serverData = query.data?.data as Record<string, string> | undefined
  const data = useMemo(
    () => ({ ...(serverData ?? {}), ...overrides }),
    [serverData, overrides],
  )

  const save = useCallback(async (items: Record<string, string>) => {
    setSaving(true)
    try {
      const { data: res } = await putAdminSettingsByGroup({
        path: { group },
        body: { items },
      })
      if (res?.code === 0) {
        const warnings = (res.data as { warnings?: string[] } | undefined)?.warnings
        if (warnings?.length) {
          for (const w of warnings) toast.warning(w)
        } else {
          toast.success("保存成功")
        }
        // 保存成功后将已保存项合并进缓存，保持缓存与服务端一致（原实现为本地 setData 合并）
        queryClient.setQueryData<GetAdminSettingsByGroupResponse>(
          getAdminSettingsByGroupQueryKey({ path: { group } }),
          (old) => old
            ? { ...old, data: { ...(old.data as Record<string, string> | undefined ?? {}), ...items } }
            : old,
        )
        return true
      }
      toast.error(res?.message ?? "保存失败")
      return false
    } catch (err) {
      toast.error(getErrorMessage(err, "保存失败"))
      return false
    } finally {
      setSaving(false)
    }
  }, [group, queryClient])

  const update = useCallback((key: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }))
  }, [])

  // 原 reload 会重新加载服务端数据并丢弃本地未保存的编辑
  const reload = useCallback(async () => {
    setOverrides({})
    await queryClient.invalidateQueries({
      queryKey: getAdminSettingsByGroupQueryKey({ path: { group } }),
    })
  }, [group, queryClient])

  return { data, loading: query.isPending, saving, save, update, reload }
}
