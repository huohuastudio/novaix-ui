import { useState, useEffect, useCallback } from "react"
import { getAdminSettingsByGroup, putAdminSettingsByGroup } from "@/api"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

export function useSettings(group: string) {
  const [data, setData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await getAdminSettingsByGroup({ path: { group } })
      if (res?.code === 0 && res.data) {
        setData(res.data as unknown as Record<string, string>)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "加载设置失败"))
    } finally {
      setLoading(false)
    }
  }, [group])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载设置数据
    void load()
  }, [load])

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
        setData((prev) => ({ ...prev, ...items }))
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
  }, [group])

  const update = useCallback((key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }, [])

  return { data, loading, saving, save, update, reload: load }
}
