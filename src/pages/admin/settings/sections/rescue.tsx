import { useEffect, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { getAdminIsos } from "@/api"
import type { IsoIsoItem } from "@/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingSkeleton } from "./setting-skeleton"

export function RescueSection() {
  const { data, loading, saving, save, update } = useSettings("rescue")
  const [isos, setIsos] = useState<IsoIsoItem[]>([])

  useEffect(() => {
    getAdminIsos().then(({ data: res }) => {
      if (res?.code === 0) {
        const items = (res.data as { items?: IsoIsoItem[] })?.items ?? []
        setIsos(items.filter((iso) => iso.status === "ready"))
      }
    })
  }, [])

  if (loading) return <SettingSkeleton rows={1} />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>救援 ISO</Label>
        <Select
          value={data.rescue_iso_id || "none"}
          onValueChange={(v) => update("rescue_iso_id", v === "none" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择救援 ISO" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">未设置</SelectItem>
            {isos.map((iso) => (
              <SelectItem key={iso.id} value={String(iso.id)}>
                {iso.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          选择一个已上传的 ISO 文件作为救援系统镜像（如 SystemRescue、Finnix 等）。用户和管理员可通过救援模式从该 ISO 启动虚拟机，挂载原磁盘进行修复。
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
