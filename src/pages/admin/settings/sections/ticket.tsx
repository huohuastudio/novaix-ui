import { useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { SettingSkeleton } from "./setting-skeleton"

export function TicketSection() {
  const { data, loading, saving, save, update } = useSettings("ticket")
  const [deptInput, setDeptInput] = useState("")

  if (loading) return <SettingSkeleton rows={5} />

  const slaEnabled = data.ticket_sla_enabled === "true"

  // 部门列表：JSON 数组字符串
  let departments: string[] = []
  try {
    const parsed = JSON.parse(data.ticket_departments || "[]")
    if (Array.isArray(parsed)) departments = parsed
  } catch {
    departments = []
  }

  const addDepartment = () => {
    const trimmed = deptInput.trim()
    if (!trimmed || departments.includes(trimmed)) return
    const next = [...departments, trimmed]
    update("ticket_departments", JSON.stringify(next))
    setDeptInput("")
  }

  const removeDepartment = (dept: string) => {
    const next = departments.filter((d) => d !== dept)
    update("ticket_departments", JSON.stringify(next))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addDepartment()
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* 部门列表 */}
      <div className="space-y-2">
        <Label>工单部门</Label>
        <p className="text-xs text-muted-foreground">配置后用户提交工单时可选择部门分类，留空则不启用部门功能</p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="输入部门名称后回车添加"
            value={deptInput}
            onChange={(e) => setDeptInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button type="button" variant="outline" onClick={addDepartment}>
            添加
          </Button>
        </div>
        {departments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {departments.map((dept) => (
              <Badge key={dept} variant="secondary" className="gap-1 pr-1">
                {dept}
                <button
                  type="button"
                  className="ml-0.5 rounded-sm hover:bg-muted p-0.5"
                  onClick={() => removeDepartment(dept)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* SLA 开关 */}
      <div className="flex items-center justify-between rounded-md border p-4">
        <div className="space-y-0.5">
          <Label>SLA 响应时限</Label>
          <p className="text-xs text-muted-foreground">启用后系统会根据工单优先级自动设置响应截止时间</p>
        </div>
        <Switch
          checked={slaEnabled}
          onCheckedChange={(checked) => update("ticket_sla_enabled", checked ? "true" : "false")}
        />
      </div>

      {/* 各优先级响应时限 */}
      {slaEnabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket_sla_high_minutes">高优先级响应时限（分钟）</Label>
            <Input
              id="ticket_sla_high_minutes"
              type="number"
              min={1}
              value={data.ticket_sla_high_minutes ?? "60"}
              onChange={(e) => update("ticket_sla_high_minutes", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">高优先级工单的最长首次响应时间</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket_sla_medium_minutes">中优先级响应时限（分钟）</Label>
            <Input
              id="ticket_sla_medium_minutes"
              type="number"
              min={1}
              value={data.ticket_sla_medium_minutes ?? "240"}
              onChange={(e) => update("ticket_sla_medium_minutes", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">中优先级工单的最长首次响应时间</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket_sla_low_minutes">低优先级响应时限（分钟）</Label>
            <Input
              id="ticket_sla_low_minutes"
              type="number"
              min={1}
              value={data.ticket_sla_low_minutes ?? "480"}
              onChange={(e) => update("ticket_sla_low_minutes", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">低优先级工单的最长首次响应时间</p>
          </div>
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
