import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SettingSkeleton } from "./setting-skeleton"

export function SecuritySection() {
  const { data, loading, saving, save, update } = useSettings("security")

  if (loading) return <SettingSkeleton rows={4} />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="login_max_attempts">登录失败锁定次数</Label>
          <Input
            id="login_max_attempts"
            type="number"
            min={1}
            value={data.login_max_attempts ?? "5"}
            onChange={(e) => update("login_max_attempts", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">连续登录失败达到此次数后锁定</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="login_lock_minutes">锁定时长（分钟）</Label>
          <Input
            id="login_lock_minutes"
            type="number"
            min={1}
            value={data.login_lock_minutes ?? "15"}
            onChange={(e) => update("login_lock_minutes", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="session_timeout_minutes">会话超时（分钟）</Label>
        <Input
          id="session_timeout_minutes"
          type="number"
          min={1}
          value={data.session_timeout_minutes ?? "1440"}
          onChange={(e) => update("session_timeout_minutes", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">用户无操作超过此时间后需重新登录，1440 分钟 = 24 小时</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>强制管理员两步验证</Label>
          <p className="text-xs text-muted-foreground mt-1">启用后所有管理员必须绑定两步验证才能访问后台</p>
        </div>
        <Switch
          checked={data.force_admin_2fa === "true"}
          onCheckedChange={(checked) => update("force_admin_2fa", checked ? "true" : "false")}
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
