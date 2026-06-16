import type { UseFormReturn } from "react-hook-form"
import { ConfigSection, ConfigTable, SwitchRow, type ConfigRowItem } from "@/components/config-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConfigReset } from "@/hooks/use-config-reset"

interface MigrationSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function MigrationSection({ form }: MigrationSectionProps) {
  const instanceType = form.watch("type")
  const reset = useConfigReset(form)

  const rows: ConfigRowItem[] = [
    {
      key: "migration_stateful",
      label: "migration.stateful",
      description: "允许有状态的停止/启动和快照（保留内存状态）",
      instanceType: "virtual-machine",
      onReset: reset("migration_stateful"),
      children: (
        <SwitchRow
          checked={form.watch("migration_stateful")}
          onCheckedChange={(v) => form.setValue("migration_stateful", v)}
          typeTag="virtual-machine"
        />
      ),
    },
    {
      key: "cluster_evacuate",
      label: "cluster.evacuate",
      description: "当集群成员需要维护时，指定该实例的疏散行为",
      onReset: reset("cluster_evacuate"),
      children: (
        <Select
          onValueChange={(v) => form.setValue("cluster_evacuate", v === "__unset__" ? "" : v)}
          value={form.watch("cluster_evacuate") || "__unset__"}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="自动" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">未设置</SelectItem>
            <SelectItem value="auto">自动</SelectItem>
            <SelectItem value="migrate">迁移</SelectItem>
            <SelectItem value="live-migrate">在线迁移</SelectItem>
            <SelectItem value="stop">停止</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ]

  return (
    <ConfigSection
      title="迁移配置"
      description="配置实例的迁移行为和集群疏散策略"
    >
      <ConfigTable rows={rows} currentInstanceType={instanceType} />
    </ConfigSection>
  )
}
