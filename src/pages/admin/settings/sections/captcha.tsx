import { ProviderSettingsForm } from "@/components/provider-settings-form"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState } from "react"

const FORM_OPTIONS = [
  { value: "login", label: "登录" },
  { value: "register", label: "注册" },
  { value: "send_code", label: "发送验证码" },
  { value: "reset_password", label: "重置密码" },
]

export function CaptchaSection() {
  return (
    <ProviderSettingsForm
      kind="captcha"
      title="人机验证"
      description="配置验证码服务，防止自动化攻击。启用后可选择在登录、注册、找回密码等表单中显示验证码"
      enableLabel="启用人机验证"
      enableHint="启用后指定表单将要求完成验证码"
      selectPlaceholder="请选择验证码渠道"
      renderExtra={({ enabled, data, update, save, saving }) => {
        if (!enabled) return null
        return (
          <CaptchaFormsSection
            forms={data.captcha_forms || ""}
            onChange={(v) => update("captcha_forms", v)}
            onSave={() => save({ captcha_forms: data.captcha_forms || "" })}
            saving={saving}
          />
        )
      }}
    />
  )
}

function CaptchaFormsSection({
  forms,
  onChange,
  onSave,
  saving,
}: {
  forms: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}) {
  const [localSaving, setLocalSaving] = useState(false)
  const selected = forms.split(",").filter(Boolean)

  const toggleForm = (form: string) => {
    const newForms = selected.includes(form)
      ? selected.filter((f) => f !== form)
      : [...selected, form]
    onChange(newForms.join(","))
  }

  const handleSave = async () => {
    setLocalSaving(true)
    await onSave()
    setLocalSaving(false)
  }

  return (
    <div className="mt-8 max-w-2xl">
      <Separator className="mb-6" />
      <h3 className="text-sm font-medium">保护范围</h3>
      <p className="text-xs text-muted-foreground mt-1">选择需要显示验证码的表单</p>
      <div className="mt-4 space-y-3">
        {FORM_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <Checkbox
              id={`captcha-form-${opt.value}`}
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggleForm(opt.value)}
            />
            <Label htmlFor={`captcha-form-${opt.value}`} className="font-normal cursor-pointer">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={saving || localSaving}>
        {(saving || localSaving) && <Loader2 className="size-4 animate-spin" />}
        保存
      </Button>
    </div>
  )
}
