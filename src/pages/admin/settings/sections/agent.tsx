import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SettingSkeleton } from "./setting-skeleton"
import { HelpLink } from "@/components/help-doc"

export function AgentSection() {
  const { data, loading, saving, save, update } = useSettings("agent")

  if (loading) return <SettingSkeleton rows={2} />

  const enabled = data.agent_enabled === "true"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Label>代理功能</Label>
            <HelpLink path="/novaix/agent" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">启用后允许用户成为代理并获得推荐返佣</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => update("agent_enabled", checked ? "true" : "false")}
        />
      </div>

      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="agent_default_commission_rate">默认返佣比例（%）</Label>
          <Input
            id="agent_default_commission_rate"
            type="number"
            min={1}
            max={100}
            value={data.agent_default_commission_rate ?? "10"}
            onChange={(e) => update("agent_default_commission_rate", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">新设置代理时的默认返佣比例</p>
        </div>
      )}

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
