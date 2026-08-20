import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SettingSkeleton } from "./setting-skeleton"

export function RefundSection() {
  const { data, loading, saving, save, update } = useSettings("refund")

  if (loading) return <SettingSkeleton rows={4} />

  const enabled = data.refund_enabled !== "false"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>允许退款</Label>
          <p className="text-xs text-muted-foreground">全局默认是否允许用户申请退款，套餐可单独覆盖</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => update("refund_enabled", v ? "true" : "false")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="refund_window_hours">退款时间窗口（小时）</Label>
        <Input
          id="refund_window_hours"
          type="number"
          min={0}
          max={87600}
          value={data.refund_window_hours ?? "0"}
          onChange={(e) => update("refund_window_hours", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">购买后多少小时内允许退款，0 表示不限制</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="refund_traffic_limit">退款流量阈值（GB）</Label>
        <Input
          id="refund_traffic_limit"
          type="number"
          min={0}
          value={data.refund_traffic_limit ?? "0"}
          onChange={(e) => update("refund_traffic_limit", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">已用流量超过此阈值则不允许退款，0 表示不限制</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="refund_max_count">退款次数上限</Label>
        <Input
          id="refund_max_count"
          type="number"
          min={0}
          value={data.refund_max_count ?? "0"}
          onChange={(e) => update("refund_max_count", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">同一用户在同一套餐下最多可退款的次数，0 表示不限制</p>
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
