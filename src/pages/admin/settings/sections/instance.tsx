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

export function InstanceSection() {
  const { data, loading, saving, save, update } = useSettings("instance")

  if (loading) return <SettingSkeleton rows={5} />

  const autoPassword = data.instance_auto_password !== "false"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="instance_hostname_prefix">主机名前缀</Label>
        <Input
          id="instance_hostname_prefix"
          value={data.instance_hostname_prefix ?? ""}
          onChange={(e) => update("instance_hostname_prefix", e.target.value)}
          placeholder="例如 HK、JP、US"
        />
        <p className="text-xs text-muted-foreground">自动生成主机名时的固定前缀，留空则不添加前缀</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instance_hostname_suffix_type">后缀类型</Label>
        <Select
          value={data.instance_hostname_suffix_type ?? "random_alpha_num"}
          onValueChange={(v) => update("instance_hostname_suffix_type", v)}
        >
          <SelectTrigger id="instance_hostname_suffix_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="random_alpha_num">字母 + 数字</SelectItem>
            <SelectItem value="random_num">纯数字</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">主机名后缀的随机字符类型</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instance_hostname_suffix_length">后缀长度</Label>
        <Input
          id="instance_hostname_suffix_length"
          type="number"
          min={6}
          max={32}
          value={data.instance_hostname_suffix_length ?? "8"}
          onChange={(e) => update("instance_hostname_suffix_length", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">随机后缀的字符数，最低 6 位以避免重名</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>自动生成密码</Label>
          <p className="text-xs text-muted-foreground">下单时自动生成一个随机强密码</p>
        </div>
        <Switch
          checked={autoPassword}
          onCheckedChange={(v) => update("instance_auto_password", v ? "true" : "false")}
        />
      </div>

      {autoPassword && (
        <div className="space-y-2">
          <Label htmlFor="instance_auto_password_length">密码长度</Label>
          <Input
            id="instance_auto_password_length"
            type="number"
            min={8}
            max={64}
            value={data.instance_auto_password_length ?? "16"}
            onChange={(e) => update("instance_auto_password_length", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">自动生成密码的字符长度，最低 8 位</p>
        </div>
      )}

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
