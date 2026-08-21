import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { SettingSkeleton } from "./setting-skeleton"

const cspFields = [
  { key: "csp_extra_script_src", label: "script-src", desc: "允许加载的外部脚本域名" },
  { key: "csp_extra_connect_src", label: "connect-src", desc: "允许发起请求的外部域名" },
  { key: "csp_extra_img_src", label: "img-src", desc: "允许加载的外部图片域名" },
  { key: "csp_extra_frame_src", label: "frame-src", desc: "允许嵌入的外部页面域名" },
  { key: "csp_extra_style_src", label: "style-src", desc: "允许加载的外部样式域名" },
] as const

export function AdvancedSection() {
  const { data, loading, saving, save, update } = useSettings("advanced")

  if (loading) return <SettingSkeleton />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label>API 文档</Label>
          <p className="text-xs text-muted-foreground mt-1">启用后可通过 /docs 访问 API 文档</p>
        </div>
        <Switch
          checked={data.api_docs_enabled === "true"}
          onCheckedChange={(checked) => update("api_docs_enabled", checked ? "true" : "false")}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="update_mirror_url">更新镜像地址</Label>
        <Input
          id="update_mirror_url"
          value={data.update_mirror_url ?? ""}
          onChange={(e) => update("update_mirror_url", e.target.value)}
          placeholder="https://ghfast.top"
        />
        <p className="text-xs text-muted-foreground">
          系统在线更新时的下载加速镜像，国内服务器建议配置。留空则直接从 GitHub 下载
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">CSP 额外白名单</h3>
          <p className="text-xs text-muted-foreground mt-1">
            如果使用了 Cloudflare Web Analytics、第三方客服、统计等服务，需要将其域名添加到对应的 CSP 指令白名单中，否则浏览器会拦截这些外部资源。每行一个域名，格式为 https://域名
          </p>
        </div>
        {cspFields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Textarea
              id={field.key}
              value={data[field.key] ?? ""}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={`https://example.com\nhttps://cdn.example.com`}
              rows={2}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">{field.desc}</p>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
