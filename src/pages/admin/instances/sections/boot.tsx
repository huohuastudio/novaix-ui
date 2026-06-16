import type { UseFormReturn } from "react-hook-form"
import { ConfigSection, ConfigTable, SwitchRow, type ConfigRowItem } from "@/components/config-table"
import { Input } from "@/components/ui/input"
import { useConfigReset } from "@/hooks/use-config-reset"

interface BootSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function BootSection({ form }: BootSectionProps) {
  const reset = useConfigReset(form)

  const rows: ConfigRowItem[] = [
    {
      key: "boot_autostart",
      label: "boot.autostart",
      description: "宿主机启动时自动启动实例",
      onReset: reset("boot_autostart"),
      children: (
        <SwitchRow
          checked={form.watch("boot_autostart")}
          onCheckedChange={(v) => form.setValue("boot_autostart", v)}
        />
      ),
    },
    {
      key: "boot_autostart_priority",
      label: "boot.autostart.priority",
      description: "自动启动优先级（数字越大越先启动）",
      onReset: reset("boot_autostart_priority"),
      children: (
        <Input
          type="number"
          className="w-24"
          {...form.register("boot_autostart_priority", { valueAsNumber: true })}
        />
      ),
    },
    {
      key: "boot_autostart_delay",
      label: "boot.autostart.delay",
      description: "自动启动延迟（秒）",
      onReset: reset("boot_autostart_delay"),
      children: (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            min={0}
            {...form.register("boot_autostart_delay", { valueAsNumber: true })}
          />
          <span className="text-sm text-muted-foreground">秒</span>
        </div>
      ),
    },
    {
      key: "boot_stop_priority",
      label: "boot.stop.priority",
      description: "关机优先级（数字越大越先关闭）",
      onReset: reset("boot_stop_priority"),
      children: (
        <Input
          type="number"
          className="w-24"
          {...form.register("boot_stop_priority", { valueAsNumber: true })}
        />
      ),
    },
    {
      key: "boot_host_shutdown_timeout",
      label: "boot.host_shutdown_timeout",
      description: "宿主机关机时强制停止实例的超时时间",
      onReset: reset("boot_host_shutdown_timeout"),
      children: (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            min={0}
            {...form.register("boot_host_shutdown_timeout", { valueAsNumber: true })}
          />
          <span className="text-sm text-muted-foreground">秒</span>
        </div>
      ),
    },
  ]

  return (
    <ConfigSection
      title="引导配置"
      description="配置实例的自动启动、启动优先级和关机行为"
    >
      <ConfigTable rows={rows} />
    </ConfigSection>
  )
}
