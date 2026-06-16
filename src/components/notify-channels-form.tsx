import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  getAdminProvidersByKind,
  postAdminSettingsNotifyByNameTest,
  type ProviderDescriptor,
} from "@/api"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SettingSkeleton } from "@/pages/admin/settings/sections/setting-skeleton"
import { FieldGrid } from "@/components/provider-settings-form"
import { isFieldVisible, validateField } from "@/lib/provider-field-utils"
import { getErrorMessage } from "@/lib/utils"

/** 通知渠道多选配置:列出所有渠道,每个可独立启用、配置与测试 */
export function NotifyChannelsForm() {
  const [descriptors, setDescriptors] = useState<ProviderDescriptor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { data: res } = await getAdminProvidersByKind({ path: { kind: "notify" } })
        if (alive && res?.code === 0 && res.data) setDescriptors(res.data)
      } catch (err) {
        toast.error(getErrorMessage(err, "加载通知渠道失败"))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <SettingSkeleton />

  return (
    <div className="space-y-0">
      <h3 className="text-sm font-medium">通知渠道</h3>
      <p className="text-xs text-muted-foreground mt-1">
        配置节点告警等系统通知的推送渠道，可同时启用多个；邮件告警仍由「邮件通知」配置
      </p>
      <div className="mt-6 space-y-4">
        {descriptors.map((d) => (
          <ChannelCard key={d.name} descriptor={d} />
        ))}
      </div>
    </div>
  )
}

function ChannelCard({ descriptor }: { descriptor: ProviderDescriptor }) {
  const group = `notify_${descriptor.name}`
  const settings = useSettings(group)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)

  if (settings.loading) return <SettingSkeleton rows={2} />

  const fields = descriptor.fields ?? []

  const fieldValues: Record<string, string> = {}
  for (const f of fields) {
    fieldValues[f.key ?? ""] = settings.data[`${group}_${f.key}`] ?? f.default ?? ""
  }

  const enabled = fieldValues["enabled"] === "true"

  const handleSave = async () => {
    setErrors({})
    if (enabled) {
      const errs: Record<string, string> = {}
      for (const f of fields) {
        if (f.key === "enabled") continue
        if (!isFieldVisible(f, fieldValues)) continue
        const val = settings.data[`${group}_${f.key}`] ?? f.default ?? ""
        const err = validateField(f, val)
        if (err) errs[f.key!] = err
      }
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        return
      }
    }

    setSaving(true)
    const items: Record<string, string> = {}
    for (const f of fields) {
      if (!isFieldVisible(f, fieldValues)) continue
      const key = `${group}_${f.key}`
      items[key] = settings.data[key] ?? f.default ?? ""
    }
    await settings.save(items)
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const { data: res } = await postAdminSettingsNotifyByNameTest({ path: { name: descriptor.name ?? "" } })
      if (res?.code === 0) {
        toast.success("测试通知已发送")
      } else {
        toast.error(res?.message ?? "发送失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "发送失败"))
    } finally {
      setTesting(false)
    }
  }

  if (descriptor.plugin) {
    return (
      <div className="rounded-md border p-4 max-w-2xl">
        <h4 className="text-sm font-medium">{descriptor.title}</h4>
        <p className="mt-2 text-xs text-muted-foreground">该渠道由插件提供，请在「插件管理」页面中配置和启用</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border p-4 max-w-2xl">
      <h4 className="text-sm font-medium">{descriptor.title}</h4>
      <div className="mt-4 space-y-4">
        <FieldGrid
          fields={fields}
          fieldValues={fieldValues}
          errors={errors}
          getValue={(f) => settings.data[`${group}_${f.key}`] ?? f.default ?? ""}
          onChange={(f, v) => {
            settings.update(`${group}_${f.key}`, v)
            if (errors[f.key!]) setErrors((prev) => { const n = { ...prev }; delete n[f.key!]; return n })
          }}
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing && <Loader2 className="size-4 animate-spin" />}
            测试发送
          </Button>
        </div>
      </div>
      <Separator className="mt-4" />
    </div>
  )
}
