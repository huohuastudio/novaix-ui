import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SettingSkeleton } from "./setting-skeleton"

export function AlertSection() {
  const { data, loading, saving, save, update } = useSettings("alert")

  if (loading) return <SettingSkeleton rows={5} />

  const enabled = data.alert_enabled === "true"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>启用告警</Label>
          <p className="text-xs text-muted-foreground">开启后，节点资源超过阈值时将发送邮件通知</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => update("alert_enabled", v ? "true" : "false")}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="alert_email">接收邮箱</Label>
            <Input
              id="alert_email"
              type="email"
              placeholder="留空则使用 SMTP 发件人地址"
              value={data.alert_email ?? ""}
              onChange={(e) => update("alert_email", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">告警邮件发送目标，留空则使用 SMTP 设置中的发件人地址</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert_cpu_threshold">CPU 使用率阈值（%）</Label>
            <Input
              id="alert_cpu_threshold"
              type="number"
              min={0}
              max={100}
              value={data.alert_cpu_threshold ?? "90"}
              onChange={(e) => update("alert_cpu_threshold", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert_memory_threshold">内存使用率阈值（%）</Label>
            <Input
              id="alert_memory_threshold"
              type="number"
              min={0}
              max={100}
              value={data.alert_memory_threshold ?? "90"}
              onChange={(e) => update("alert_memory_threshold", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert_disk_threshold">磁盘使用率阈值（%）</Label>
            <Input
              id="alert_disk_threshold"
              type="number"
              min={0}
              max={100}
              value={data.alert_disk_threshold ?? "90"}
              onChange={(e) => update("alert_disk_threshold", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert_cooldown_minutes">告警冷却时间（分钟）</Label>
            <Input
              id="alert_cooldown_minutes"
              type="number"
              min={1}
              value={data.alert_cooldown_minutes ?? "60"}
              onChange={(e) => update("alert_cooldown_minutes", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">同一类型告警的最小间隔时间，避免频繁通知</p>
          </div>
        </>
      )}

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
