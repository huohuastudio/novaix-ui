import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingSkeleton } from "./setting-skeleton"

export function RechargeSection() {
  const { data, loading, saving, save, update } = useSettings("recharge")

  if (loading) return <SettingSkeleton rows={1} />

  const minAmountYuan = data.recharge_min_amount
    ? (parseInt(data.recharge_min_amount) / 100).toString()
    : "0"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="recharge_min_amount">最小充值金额（元）</Label>
        <Input
          id="recharge_min_amount"
          type="number"
          min={0}
          step="0.01"
          value={minAmountYuan}
          onChange={(e) => {
            const fen = Math.round(parseFloat(e.target.value || "0") * 100)
            update("recharge_min_amount", fen.toString())
          }}
        />
        <p className="text-xs text-muted-foreground">系统最低充值 1 元，设为 0 表示使用系统默认，设置更高金额可抬高最低充值门槛</p>
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
