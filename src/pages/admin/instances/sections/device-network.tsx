import type { NodeResources } from "@/hooks/use-node-resources"
import type { IncusConfigForm } from "@/types/incus-config"
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
  form: IncusConfigForm
  nodeResources: NodeResources
  nodeId?: number
}

export function NetworkDeviceSection({ form, nodeResources, nodeId: nodeIdProp }: NetworkDeviceSectionProps) {
  const { networks, loading, error } = nodeResources
  const nodeId = nodeIdProp ?? form.watch("node_id")
  const isRouted = form.watch("network_device_config")?.nictype === "routed"

  return (
    <ConfigSection
      title="网络设备"
      description="配置实例的网络接口"
    >
      <div className="max-w-2xl space-y-6">
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
        {!isRouted && ([
          { name: "network_ipv4_filtering", label: "IPv4 地址防伪造", description: "开启后仅允许使用分配的 IPv4 地址；关闭后可使用其他 IPv4 地址。" },
          { name: "network_ipv6_filtering", label: "IPv6 地址防伪造", description: "开启后仅允许使用分配的 IPv6 地址。" },
          { name: "network_mac_filtering", label: "MAC 地址防伪造", description: "开启后禁止伪造 MAC 地址。启用 IP 地址防伪造时会同时启用此保护。" },
        ] as const).map(({ name, label, description }) => (
          <FormField key={name} control={form.control} name={name} render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="default">默认</SelectItem>
                  <SelectItem value="true">开启</SelectItem>
                  <SelectItem value="false">关闭</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>{description}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        ))}
        <p className="text-sm text-muted-foreground">
          {isRouted ? "路由网络不支持这些桥接过滤选项。" : "默认不指定过滤策略；创建时分配固定 IP 会默认启用对应地址防伪造。"}
        </p>
      </div>
    </ConfigSection>
  )
}
