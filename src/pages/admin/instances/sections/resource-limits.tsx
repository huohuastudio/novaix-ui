import type { UseFormReturn } from "react-hook-form"
import { ConfigSection, ConfigTable, type ConfigRowItem } from "@/components/config-table"
import { Input } from "@/components/ui/input"
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConfigReset } from "@/hooks/use-config-reset"

interface ResourceLimitsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function ResourceLimitsSection({ form }: ResourceLimitsSectionProps) {
  const instanceType = form.watch("type")
  const diskPriority = form.watch("limits_disk_priority")
  const reset = useConfigReset(form)

  const rows: ConfigRowItem[] = [
    {
      key: "cpu",
      label: "limits.cpu",
      description: "CPU 核心数或固定 CPU 绑定",
      children: (
        <FormField
          control={form.control}
          name="cpu"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    className="w-24"
                    min={1}
                    max={128}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">核</span>
              </div>
            </FormItem>
          )}
        />
      ),
    },
    {
      key: "memory",
      label: "limits.memory",
      description: "内存大小限制",
      children: (
        <FormField
          control={form.control}
          name="memory"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    className="w-24"
                    min={64}
                    max={524288}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">MB</span>
              </div>
            </FormItem>
          )}
        />
      ),
    },
    {
      key: "limits_memory_swap",
      label: "limits.memory.swap",
      description: "是否允许将实例内存交换到磁盘",
      instanceType: "container",
      onReset: reset("limits_memory_swap"),
      children: (
        <Select
          value={form.watch("limits_memory_swap")}
          onValueChange={(v) => form.setValue("limits_memory_swap", v === "__unset__" ? "" : v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="未设置" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">未设置</SelectItem>
            <SelectItem value="true">允许</SelectItem>
            <SelectItem value="false">禁止</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "limits_disk_priority",
      label: "limits.disk.priority",
      description: "磁盘 I/O 优先级（0 最低，10 最高）",
      onReset: reset("limits_disk_priority"),
      children: (
        <Select
          value={diskPriority != null ? String(diskPriority) : "__unset__"}
          onValueChange={(v) => form.setValue("limits_disk_priority", v === "__unset__" ? undefined : Number(v))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="未设置" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">未设置</SelectItem>
            {Array.from({ length: 11 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>
                {String(i)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "limits_processes",
      label: "limits.processes",
      description: "实例内最大进程数",
      instanceType: "container",
      onReset: reset("limits_processes"),
      children: (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            min={0}
            value={form.watch("limits_processes") ?? ""}
            onChange={(e) =>
              form.setValue("limits_processes", e.target.value ? Number(e.target.value) : undefined)
            }
          />
          <span className="text-sm text-muted-foreground">（留空不限制）</span>
        </div>
      ),
    },
    {
      key: "disk",
      label: "limits.disk",
      description: "磁盘空间配额",
      children: (
        <FormField
          control={form.control}
          name="disk"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    className="w-24"
                    min={1}
                    max={10240}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">GB</span>
              </div>
            </FormItem>
          )}
        />
      ),
    },
    {
      key: "bandwidth",
      label: "bandwidth",
      description: "网络带宽限制（Novaix 业务字段）",
      children: (
        <FormField
          control={form.control}
          name="bandwidth"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    className="w-24"
                    min={0}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">Mbps（0 表示不限制）</span>
              </div>
            </FormItem>
          )}
        />
      ),
    },
    {
      key: "traffic_limit",
      label: "traffic_limit",
      description: "月流量限制（Novaix 业务字段）",
      children: (
        <FormField
          control={form.control}
          name="traffic_limit"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    className="w-24"
                    min={0}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">GB（0 表示不限制）</span>
              </div>
            </FormItem>
          )}
        />
      ),
    },
  ]

  return (
    <ConfigSection
      title="资源限制"
      description="配置实例的 CPU、内存、磁盘和网络资源限制"
    >
      <ConfigTable rows={rows} currentInstanceType={instanceType} />
    </ConfigSection>
  )
}
