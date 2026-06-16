import type { UseFormReturn } from "react-hook-form"
import { ConfigSection } from "@/components/config-table"
import { Textarea } from "@/components/ui/textarea"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface CloudInitSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function CloudInitSection({ form }: CloudInitSectionProps) {
  return (
    <ConfigSection
      title="Cloud Init"
      description="配置 cloud-init 用户数据、网络配置和厂商数据"
    >
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="cloud_init_user_data"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户数据 (user-data)</FormLabel>
              <FormControl>
                <Textarea
                  rows={8}
                  className="font-mono text-sm"
                  placeholder={"#cloud-config\npackages:\n  - nginx\nruncmd:\n  - systemctl start nginx"}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                cloud-init 用户数据，支持 cloud-config 或 shell 脚本格式
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cloud_init_network_config"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网络配置 (network-config)</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  className="font-mono text-sm"
                  placeholder={"network:\n  version: 2\n  ethernets:\n    eth0:\n      dhcp4: true"}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                cloud-init 网络配置（YAML 格式）
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cloud_init_vendor_data"
          render={({ field }) => (
            <FormItem>
              <FormLabel>厂商数据 (vendor-data)</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  className="font-mono text-sm"
                  placeholder="#cloud-config"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                cloud-init 厂商数据，通常由基础设施提供商配置
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </ConfigSection>
  )
}
