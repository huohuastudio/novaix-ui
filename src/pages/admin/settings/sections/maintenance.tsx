import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { SettingSkeleton } from "./setting-skeleton"

export function MaintenanceSection() {
  const { data, loading, saving, save, update } = useSettings("maintenance")

  if (loading) return <SettingSkeleton rows={2} />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>维护模式</Label>
          <p className="text-xs text-muted-foreground mt-1">开启后前台将显示维护提示，管理员仍可正常访问后台</p>
        </div>
        <Switch
          checked={data.maintenance_enabled === "true"}
          onCheckedChange={(checked) => update("maintenance_enabled", checked ? "true" : "false")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maintenance_message">维护提示信息</Label>
        <Textarea
          id="maintenance_message"
          rows={3}
          value={data.maintenance_message ?? ""}
          onChange={(e) => update("maintenance_message", e.target.value)}
          placeholder="系统维护中，请稍后再试"
        />
        <p className="text-xs text-muted-foreground">维护模式开启后展示给用户的提示文案</p>
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
