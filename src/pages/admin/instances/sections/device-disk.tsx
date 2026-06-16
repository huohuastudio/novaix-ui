import type { UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
import { ConfigSection } from "@/components/config-table"
import { Input } from "@/components/ui/input"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

interface DiskDeviceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  nodeResources: NodeResources
  nodeId?: number
}

export function DiskDeviceSection({ form, nodeResources, nodeId: nodeIdProp }: DiskDeviceSectionProps) {
  const { storagePools, loading, error } = nodeResources
  const nodeId = nodeIdProp ?? form.watch("node_id")

  return (
    <ConfigSection
      title="磁盘设备"
      description="配置实例的根磁盘和存储池"
    >
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="disk_pool"
          render={({ field }) => (
            <FormItem>
              <FormLabel>存储池</FormLabel>
              {!nodeId ? (
                <p className="text-sm text-muted-foreground">请先选择宿主机节点</p>
              ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  加载存储池列表...
                </div>
              ) : error ? (
                <FormControl>
                  <Input placeholder="default" {...field} />
                </FormControl>
              ) : (
                <Select
                  onValueChange={(v) => field.onChange(v === "__unset__" ? "" : v)}
                  value={field.value || "__unset__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择存储池" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__unset__">不指定（使用默认存储池）</SelectItem>
                    {storagePools.map((p) => (
                      <SelectItem key={p.name} value={p.name!}>
                        {p.name} ({p.driver})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormDescription>
                选择实例根磁盘所在的存储池
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="disk_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>磁盘大小</FormLabel>
              <FormControl>
                <Input placeholder="例如: 10GiB, 50GiB" {...field} />
              </FormControl>
              <FormDescription>
                根磁盘大小，例如 10GiB、50GiB。留空使用默认配置中的值
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </ConfigSection>
  )
}
