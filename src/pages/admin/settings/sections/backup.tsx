import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingSkeleton } from "./setting-skeleton"

export function BackupSection() {
  const { data, loading, saving, save, update } = useSettings("backup")

  if (loading) return <SettingSkeleton rows={4} />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>自动备份</Label>
          <p className="text-xs text-muted-foreground mt-1">开启后系统将按策略为已启用的实例自动创建快照备份</p>
        </div>
        <Switch
          checked={data.backup_enabled === "true"}
          onCheckedChange={(checked) => update("backup_enabled", checked ? "true" : "false")}
        />
      </div>

      <div className="space-y-2">
        <Label>备份频率</Label>
        <Select value={data.backup_frequency ?? "daily"} onValueChange={(v) => update("backup_frequency", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">每天</SelectItem>
            <SelectItem value="weekly">每周</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">每个实例的自动快照创建频率</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="backup_retention">保留数量</Label>
        <Input
          id="backup_retention"
          type="number"
          min={1}
          max={30}
          value={data.backup_retention ?? "3"}
          onChange={(e) => update("backup_retention", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">每个实例最多保留的自动备份快照数量，超出后自动删除最早的快照</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="backup_hour">执行时间</Label>
        <Select value={data.backup_hour ?? "3"} onValueChange={(v) => update("backup_hour", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>
                {String(i).padStart(2, "0")}:00
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">每天执行自动备份的时间（服务器时区）</p>
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
