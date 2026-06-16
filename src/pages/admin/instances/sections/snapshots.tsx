import type { UseFormReturn } from "react-hook-form"
import { ConfigSection, ConfigTable, SwitchRow, type ConfigRowItem } from "@/components/config-table"
import { Input } from "@/components/ui/input"
import { useConfigReset } from "@/hooks/use-config-reset"

interface SnapshotsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function SnapshotsSection({ form }: SnapshotsSectionProps) {
  const reset = useConfigReset(form)

  const rows: ConfigRowItem[] = [
    {
      key: "snapshots_schedule",
      label: "snapshots.schedule",
      description: "快照计划（Cron 表达式）",
      onReset: reset("snapshots_schedule"),
      children: (
        <Input
          className="w-64"
          placeholder="例如: @daily, @hourly, 0 0 * * *"
          {...form.register("snapshots_schedule")}
        />
      ),
    },
    {
      key: "snapshots_schedule_stopped",
      label: "snapshots.schedule.stopped",
      description: "实例停止时也执行快照计划",
      onReset: reset("snapshots_schedule_stopped"),
      children: (
        <SwitchRow
          checked={form.watch("snapshots_schedule_stopped")}
          onCheckedChange={(v) => form.setValue("snapshots_schedule_stopped", v)}
        />
      ),
    },
    {
      key: "snapshots_pattern",
      label: "snapshots.pattern",
      description: "快照命名模板",
      onReset: reset("snapshots_pattern"),
      children: (
        <Input
          className="w-64"
          placeholder="例如: snap%d"
          {...form.register("snapshots_pattern")}
        />
      ),
    },
    {
      key: "snapshots_expiry",
      label: "snapshots.expiry",
      description: "快照过期时间",
      onReset: reset("snapshots_expiry"),
      children: (
        <Input
          className="w-64"
          placeholder="例如: 1M 2H 3d 4w 5m 6y"
          {...form.register("snapshots_expiry")}
        />
      ),
    },
  ]

  return (
    <ConfigSection
      title="快照配置"
      description="配置自动快照计划和快照保留策略"
    >
      <ConfigTable rows={rows} />
    </ConfigSection>
  )
}
