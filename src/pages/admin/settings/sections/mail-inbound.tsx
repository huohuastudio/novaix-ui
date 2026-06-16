import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingSkeleton } from "./setting-skeleton"

export function MailInboundSection() {
  const { data, loading, saving, save, update } = useSettings("mail_inbound")

  if (loading) return <SettingSkeleton rows={4} />

  const enabled = data.mail_inbound_enabled === "true"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>启用邮件回复</Label>
          <p className="text-xs text-muted-foreground">启用后，用户可通过直接回复工单通知邮件来回复工单。需配合邮件服务商的入站路由功能使用。</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => update("mail_inbound_enabled", v ? "true" : "false")}
        />
      </div>

      {enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="mail_inbound_provider">邮件服务商</Label>
            <Select
              value={data.mail_inbound_provider ?? "generic"}
              onValueChange={(v) => update("mail_inbound_provider", v)}
            >
              <SelectTrigger id="mail_inbound_provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">通用</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择邮件服务商以使用其专用格式解析，通用模式支持 JSON 和 form-data
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mail_inbound_webhook_secret">Webhook 密钥</Label>
            <Input
              id="mail_inbound_webhook_secret"
              type="password"
              placeholder="用于验证入站请求的合法性"
              value={data.mail_inbound_webhook_secret ?? ""}
              onChange={(e) => update("mail_inbound_webhook_secret", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              配置后，入站请求需携带 <code className="text-xs bg-muted px-1 py-0.5 rounded">?token=密钥</code> 参数
            </p>
          </div>

          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm font-medium mb-2">Webhook 地址</p>
            <code className="text-xs text-muted-foreground break-all">
              POST /api/callbacks/mail/inbound{data.mail_inbound_webhook_secret ? `?token=${data.mail_inbound_webhook_secret}` : "?token=YOUR_SECRET"}
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              将此地址配置到邮件服务商的入站路由设置中
            </p>
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
