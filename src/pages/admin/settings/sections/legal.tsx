import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RichTextEditor } from "@/components/rich-text-editor"
import { SettingSkeleton } from "./setting-skeleton"

export function LegalSection() {
  const { data, loading, saving, save, update } = useSettings("legal")

  if (loading) return <SettingSkeleton rows={4} />

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tos_url">服务条款 URL</Label>
          <Input
            id="tos_url"
            value={data.tos_url ?? ""}
            onChange={(e) => update("tos_url", e.target.value)}
            placeholder="https://example.com/tos"
          />
          <p className="text-xs text-muted-foreground">如果填写了 URL，将优先使用外部链接；否则使用下方的富文本内容</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="privacy_url">隐私政策 URL</Label>
          <Input
            id="privacy_url"
            value={data.privacy_url ?? ""}
            onChange={(e) => update("privacy_url", e.target.value)}
            placeholder="https://example.com/privacy"
          />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Label>服务条款内容</Label>
        <p className="text-xs text-muted-foreground">在下单页面展示，支持富文本编辑</p>
        <RichTextEditor
          value={data.tos_content ?? ""}
          onChange={(v) => update("tos_content", v)}
        />
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Label>隐私政策内容</Label>
        <p className="text-xs text-muted-foreground">隐私政策页面展示内容</p>
        <RichTextEditor
          value={data.privacy_content ?? ""}
          onChange={(v) => update("privacy_content", v)}
        />
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
