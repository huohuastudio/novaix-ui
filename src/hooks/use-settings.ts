import { useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { putAdminSettingsByGroup } from "@/api"
import {
  getAdminSettingsByGroupOptions,
  getAdminSettingsByGroupQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { refreshSiteSettings } from "@/hooks/use-site-settings"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"

const EMPTY_DATA: Record<string, string> = {}

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

  // 保存成功后，仅清除仍等于提交值的 overrides，保留请求期间产生的新编辑
  const commitOverrides = useCallback((submitted: Record<string, string>) => {
    setOverrides((prev) => {
      const next: Record<string, string> = {}
      for (const [key, value] of Object.entries(prev)) {
        if (!(key in submitted) || value !== submitted[key]) {
          next[key] = value
        }
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [])

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
        // 以服务端脱敏结果更新缓存，不能将密码等提交明文写回查询缓存。
        await queryClient.invalidateQueries({
          queryKey: getAdminSettingsByGroupQueryKey({ path: { group } }),
        })
        commitOverrides(items)
        refreshSiteSettings()
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
  }, [group, queryClient, commitOverrides])

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

  const dirty = Object.keys(overrides).length > 0

  return { data, savedData: serverData ?? EMPTY_DATA, loading: query.isPending, saving, save, update, reload, dirty, commitOverrides }
}
