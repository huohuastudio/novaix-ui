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

export function RDNSSection() {
  const { data, loading, saving, save, update } = useSettings("rdns")

  if (loading) return <SettingSkeleton rows={4} />

  const enabled = data.rdns_enabled === "true"
  const provider = data.rdns_provider ?? "none"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>rDNS 功能</Label>
          <p className="text-xs text-muted-foreground mt-1">开启后用户可为 IP 地址设置反向 DNS 记录</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => update("rdns_enabled", checked ? "true" : "false")}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <Label>DNS 提供商</Label>
            <Select value={provider} onValueChange={(v) => update("rdns_provider", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不同步</SelectItem>
                <SelectItem value="powerdns">PowerDNS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "powerdns" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rdns_api_url">API 地址</Label>
                <Input
                  id="rdns_api_url"
                  value={data.rdns_api_url ?? ""}
                  placeholder="https://dns.example.com/api/v1"
                  onChange={(e) => update("rdns_api_url", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">PowerDNS API 服务器地址</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rdns_api_key">API 密钥</Label>
                <Input
                  id="rdns_api_key"
                  type="password"
                  value={data.rdns_api_key ?? ""}
                  placeholder="PowerDNS API Key"
                  onChange={(e) => update("rdns_api_key", e.target.value)}
                />
              </div>
            </>
          )}
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
