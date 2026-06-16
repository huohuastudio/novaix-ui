import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  getAdminProvidersByKind,
  type ProviderDescriptor,
} from "@/api"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { FieldGrid } from "@/components/provider-settings-form"
import { isFieldVisible, validateField } from "@/lib/provider-field-utils"
import { SettingSkeleton } from "./setting-skeleton"
import { getErrorMessage } from "@/lib/utils"

export function PaymentSection() {
  const [descriptors, setDescriptors] = useState<ProviderDescriptor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const { data: res } = await getAdminProvidersByKind({ path: { kind: "payment" } })
        if (res?.code === 0 && res.data) {
          setDescriptors(res.data.filter((d) => !d.plugin))
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "加载支付渠道失败"))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <SettingSkeleton rows={6} />
  if (descriptors.length === 0) return <p className="text-sm text-muted-foreground">暂无可用的支付渠道</p>

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">支付渠道</h3>
        <p className="text-xs text-muted-foreground mt-1">
          配置在线支付方式，每个渠道可独立启用。回调地址格式为站点地址 + /api/callbacks/渠道名
        </p>
      </div>
      <Tabs defaultValue={descriptors[0]?.name}>
        <TabsList className="max-w-full overflow-x-auto overflow-y-hidden no-scrollbar justify-start">
          {descriptors.map((d) => (
            <TabsTrigger key={d.name} value={d.name ?? ""}>
              {d.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {descriptors.map((d) => (
          <TabsContent key={d.name} value={d.name ?? ""}>
            <PaymentChannelForm descriptor={d} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function PaymentChannelForm({ descriptor }: { descriptor: ProviderDescriptor }) {
  const group = `payment_${descriptor.name}`
  const { data, loading, saving, save, update } = useSettings(group)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (loading) return <SettingSkeleton rows={5} />

  const fields = descriptor.fields ?? []
  const enabledKey = `${group}_enabled`
  const enabled = data[enabledKey] === "true"

  const nonEnabledFields = fields.filter((f) => f.key !== "enabled")

  const fieldValues: Record<string, string> = {}
  for (const f of nonEnabledFields) {
    fieldValues[f.key ?? ""] = data[`${group}_${f.key}`] ?? f.default ?? ""
  }

  const handleSave = () => {
    if (enabled) {
      const errs: Record<string, string> = {}
      for (const f of nonEnabledFields) {
        if (!isFieldVisible(f, fieldValues)) continue
        const val = data[`${group}_${f.key}`] ?? f.default ?? ""
        const err = validateField(f, val)
        if (err) errs[f.key!] = err
      }
      setErrors(errs)
      if (Object.keys(errs).length > 0) return
    }
    save(data)
  }

  return (
    <div className="max-w-2xl space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>启用{descriptor.title}</Label>
          <p className="text-xs text-muted-foreground">
            开启后用户可使用{descriptor.title}进行充值和支付
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => update(enabledKey, v ? "true" : "false")}
        />
      </div>

      {enabled && (
        <>
          <Separator />
          <FieldGrid
            fields={nonEnabledFields}
            fieldValues={fieldValues}
            errors={errors}
            getValue={(f) => data[`${group}_${f.key}`] ?? f.default ?? ""}
            onChange={(f, v) => {
              update(`${group}_${f.key}`, v)
              if (errors[f.key!]) setErrors((prev) => { const n = { ...prev }; delete n[f.key!]; return n })
            }}
          />
        </>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        保存
      </Button>
    </div>
  )
}
