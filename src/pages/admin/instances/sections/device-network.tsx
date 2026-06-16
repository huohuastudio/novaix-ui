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

interface NetworkDeviceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  nodeResources: NodeResources
  nodeId?: number
}

export function NetworkDeviceSection({ form, nodeResources, nodeId: nodeIdProp }: NetworkDeviceSectionProps) {
  const { networks, loading, error } = nodeResources
  const nodeId = nodeIdProp ?? form.watch("node_id")

  return (
    <ConfigSection
      title="网络设备"
      description="配置实例的网络接口"
    >
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="network_device_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>设备名称</FormLabel>
              <FormControl>
                <Input placeholder="eth0" {...field} />
              </FormControl>
              <FormDescription>
                网络设备在实例内的名称
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="network_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网络名称</FormLabel>
              {!nodeId ? (
                <p className="text-sm text-muted-foreground">请先选择宿主机节点</p>
              ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  加载网络列表...
                </div>
              ) : error ? (
                <FormControl>
                  <Input placeholder="br0" {...field} />
                </FormControl>
              ) : (
                <Select
                  onValueChange={(v) => field.onChange(v === "__unset__" ? "" : v)}
                  value={field.value || "__unset__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择网络" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__unset__">不指定（使用默认配置）</SelectItem>
                    {networks.map((n) => (
                      <SelectItem key={n.name} value={n.name!}>
                        {n.name} ({n.type}{n.managed ? ", 托管" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormDescription>
                选择实例要连接的网络
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </ConfigSection>
  )
}
