import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingSkeleton } from "./setting-skeleton"

export function LifecycleSection() {
  const { data, loading, saving, save, update } = useSettings("lifecycle")

  if (loading) return <SettingSkeleton rows={5} />

  const action = data.traffic_exceed_action ?? "throttle"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="suspend_grace_days">到期暂停宽限期（天）</Label>
        <Input
          id="suspend_grace_days"
          type="number"
          min={0}
          value={data.suspend_grace_days ?? "0"}
          onChange={(e) => update("suspend_grace_days", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">实例到期后等待多少天才暂停，0 表示立即暂停</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delete_grace_days">暂停后删除宽限期（天）</Label>
        <Input
          id="delete_grace_days"
          type="number"
          min={0}
          value={data.delete_grace_days ?? "7"}
          onChange={(e) => update("delete_grace_days", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">实例暂停后保留数据多少天，超过后自动删除</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="traffic_exceed_action">流量超限动作</Label>
        <Select
          value={action}
          onValueChange={(v) => update("traffic_exceed_action", v)}
        >
          <SelectTrigger id="traffic_exceed_action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="throttle">限速</SelectItem>
            <SelectItem value="charge">按量计费</SelectItem>
            <SelectItem value="suspend">暂停实例</SelectItem>
            <SelectItem value="ignore">忽略</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">实例月流量超过套餐限制后的处理方式</p>
      </div>

      {action === "throttle" && (
        <div className="space-y-2">
          <Label htmlFor="traffic_throttle_speed">限速速率（Mbps）</Label>
          <Input
            id="traffic_throttle_speed"
            type="number"
            min={1}
            value={data.traffic_throttle_speed ?? "1"}
            onChange={(e) => update("traffic_throttle_speed", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">流量超限后的带宽限制速率</p>
        </div>
      )}

      {action === "charge" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="traffic_overage_price">超额流量单价（分/GB）</Label>
            <Input
              id="traffic_overage_price"
              type="number"
              min={0}
              value={data.traffic_overage_price ?? "0"}
              onChange={(e) => update("traffic_overage_price", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">每 GB 超额流量的费用，从用户余额扣除。余额不足时自动降级为限速</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="traffic_throttle_speed">降级限速速率（Mbps）</Label>
            <Input
              id="traffic_throttle_speed"
              type="number"
              min={1}
              value={data.traffic_throttle_speed ?? "1"}
              onChange={(e) => update("traffic_throttle_speed", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">余额不足时的降级限速速率</p>
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
