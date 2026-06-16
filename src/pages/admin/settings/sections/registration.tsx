import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SettingSkeleton } from "./setting-skeleton"

export function RegistrationSection() {
  const { data, loading, saving, save, update } = useSettings("registration")

  if (loading) return <SettingSkeleton rows={2} />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>开放注册</Label>
          <p className="text-xs text-muted-foreground mt-1">开启后用户可以在前台自助注册账户</p>
        </div>
        <Switch
          checked={data.registration_enabled === "true"}
          onCheckedChange={(checked) => update("registration_enabled", checked ? "true" : "false")}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>邮箱验证</Label>
          <p className="text-xs text-muted-foreground mt-1">注册时要求邮箱验证码验证，关闭后用户可直接注册（不推荐）</p>
        </div>
        <Switch
          checked={data.registration_email_verify === "true"}
          onCheckedChange={(checked) => update("registration_email_verify", checked ? "true" : "false")}
        />
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
