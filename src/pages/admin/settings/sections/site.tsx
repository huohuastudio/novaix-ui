import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingSkeleton } from "./setting-skeleton"

export function SiteSection() {
  const { data, loading, saving, save, update } = useSettings("site")

  if (loading) return <SettingSkeleton />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="site_name">站点名称</Label>
        <Input
          id="site_name"
          value={data.site_name ?? ""}
          onChange={(e) => update("site_name", e.target.value)}
          placeholder="Novaix"
        />
        <p className="text-xs text-muted-foreground">显示在页面标题和邮件通知中</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="site_url">站点 URL</Label>
        <Input
          id="site_url"
          value={data.site_url ?? ""}
          onChange={(e) => update("site_url", e.target.value)}
          placeholder="https://example.com"
        />
        <p className="text-xs text-muted-foreground">用于生成邮件中的链接地址</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="site_logo">Logo URL</Label>
        <Input
          id="site_logo"
          value={data.site_logo ?? ""}
          onChange={(e) => update("site_logo", e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site_favicon">Favicon URL</Label>
        <Input
          id="site_favicon"
          value={data.site_favicon ?? ""}
          onChange={(e) => update("site_favicon", e.target.value)}
          placeholder="https://example.com/favicon.ico"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin_email">管理员邮箱</Label>
        <Input
          id="admin_email"
          type="email"
          value={data.admin_email ?? ""}
          onChange={(e) => update("admin_email", e.target.value)}
          placeholder="admin@example.com"
        />
        <p className="text-xs text-muted-foreground">接收系统告警和通知的邮箱</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="site_copyright">版权信息</Label>
        <Input
          id="site_copyright"
          value={data.site_copyright ?? ""}
          onChange={(e) => update("site_copyright", e.target.value)}
          placeholder="© 2026 公司名. All rights reserved."
        />
        <p className="text-xs text-muted-foreground">页脚版权文字，留空则自动显示"© 年份 站点名称"</p>
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
