import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { SettingSkeleton } from "./setting-skeleton"

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

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
