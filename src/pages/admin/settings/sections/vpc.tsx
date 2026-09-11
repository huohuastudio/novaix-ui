import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SettingSkeleton } from "./setting-skeleton"

export function VPCSection() {
  const { data, loading, saving, save, update } = useSettings("vpc")

  if (loading) return <SettingSkeleton rows={1} />

  const enabled = data.vpc_enabled === "true"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>私有网络功能</Label>
          <p className="text-xs text-muted-foreground mt-0.5">启用后用户可在前台创建和管理私有网络（VPC）</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => update("vpc_enabled", checked ? "true" : "false")}
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
