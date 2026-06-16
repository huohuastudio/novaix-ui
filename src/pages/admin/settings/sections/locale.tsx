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

const timezones = [
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Seoul",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "UTC",
]

export function LocaleSection() {
  const { data, loading, saving, save, update } = useSettings("locale")

  if (loading) return <SettingSkeleton rows={3} />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency_code">货币代码</Label>
          <Input
            id="currency_code"
            value={data.currency_code ?? ""}
            onChange={(e) => update("currency_code", e.target.value)}
            placeholder="CNY"
          />
          <p className="text-xs text-muted-foreground">ISO 4217 货币代码，如 CNY、USD、EUR</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency_symbol">货币符号</Label>
          <Input
            id="currency_symbol"
            value={data.currency_symbol ?? ""}
            onChange={(e) => update("currency_symbol", e.target.value)}
            placeholder="¥"
          />
          <p className="text-xs text-muted-foreground">显示在价格前面的符号</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">时区</Label>
        <Select value={data.timezone ?? "Asia/Shanghai"} onValueChange={(v) => update("timezone", v)}>
          <SelectTrigger id="timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
