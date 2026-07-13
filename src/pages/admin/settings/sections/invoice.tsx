import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { SettingSkeleton } from "./setting-skeleton"

export function InvoiceSection() {
  const { data, loading, saving, save, update } = useSettings("invoice")

  if (loading) return <SettingSkeleton rows={3} />

  const enabled = data.invoice_enabled === "true"
  const minAmountYuan = data.invoice_min_amount ? (parseInt(data.invoice_min_amount) / 100).toString() : "100"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>发票功能</Label>
          <p className="text-xs text-muted-foreground mt-0.5">启用后用户可申请电子发票</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => update("invoice_enabled", checked ? "true" : "false")}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="invoice_min_amount">最低开票金额（元）</Label>
            <Input
              id="invoice_min_amount"
              type="number"
              min={1}
              value={minAmountYuan}
              onChange={(e) => {
                const fen = Math.round(parseFloat(e.target.value || "0") * 100)
                update("invoice_min_amount", fen.toString())
              }}
            />
            <p className="text-xs text-muted-foreground">用户申请开票的最低金额</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice_notice">开票须知</Label>
            <Textarea
              id="invoice_notice"
              rows={4}
              value={data.invoice_notice ?? ""}
              onChange={(e) => update("invoice_notice", e.target.value)}
              placeholder="展示在用户申请开票页面的说明文字，如开票周期、注意事项等"
            />
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
