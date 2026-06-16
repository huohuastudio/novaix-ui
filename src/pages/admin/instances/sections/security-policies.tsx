import type { UseFormReturn } from "react-hook-form"
import { ConfigSection, ConfigTable, SwitchRow, type ConfigRowItem } from "@/components/config-table"
import { Input } from "@/components/ui/input"
import { useConfigReset } from "@/hooks/use-config-reset"

interface SecurityPoliciesSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function SecurityPoliciesSection({ form }: SecurityPoliciesSectionProps) {
  const instanceType = form.watch("type")
  const reset = useConfigReset(form)

  const privilegeRows: ConfigRowItem[] = [
    {
      key: "security_privileged",
      label: "security.privileged",
      description: "允许容器以特权模式运行，具有更高的系统权限（存在安全风险）",
      instanceType: "container",
      onReset: reset("security_privileged"),
      children: (
        <SwitchRow
          checked={form.watch("security_privileged")}
          onCheckedChange={(v) => form.setValue("security_privileged", v)}
          typeTag="container"
        />
      ),
    },
    {
      key: "security_nesting",
      label: "security.nesting",
      description: "允许在容器内运行其他容器或虚拟机",
      instanceType: "container",
      onReset: reset("security_nesting"),
      children: (
        <SwitchRow
          checked={form.watch("security_nesting")}
          onCheckedChange={(v) => form.setValue("security_nesting", v)}
          typeTag="container"
        />
      ),
    },
    {
      key: "security_protection_delete",
      label: "security.protection.delete",
      description: "防止意外删除实例，需要先禁用此保护才能删除",
      onReset: reset("security_protection_delete"),
      children: (
        <SwitchRow
          checked={form.watch("security_protection_delete")}
          onCheckedChange={(v) => form.setValue("security_protection_delete", v)}
        />
      ),
    },
    {
      key: "security_protection_shift",
      label: "security.protection.shift",
      description: "防止实例配置被意外修改（UID/GID shift 保护）",
      instanceType: "container",
      onReset: reset("security_protection_shift"),
      children: (
        <SwitchRow
          checked={form.watch("security_protection_shift")}
          onCheckedChange={(v) => form.setValue("security_protection_shift", v)}
          typeTag="container"
        />
      ),
    },
    {
      key: "security_secureboot",
      label: "security.secureboot",
      description: "启用 UEFI 安全启动功能，验证启动加载程序的数字签名",
      instanceType: "virtual-machine",
      onReset: reset("security_secureboot"),
      children: (
        <SwitchRow
          checked={form.watch("security_secureboot")}
          onCheckedChange={(v) => form.setValue("security_secureboot", v)}
          typeTag="virtual-machine"
        />
      ),
    },
    {
      key: "security_csm",
      label: "security.csm",
      description: "启用 CSM (Compatibility Support Module) 以支持传统 BIOS 启动",
      instanceType: "virtual-machine",
      onReset: reset("security_csm"),
      children: (
        <SwitchRow
          checked={form.watch("security_csm")}
          onCheckedChange={(v) => form.setValue("security_csm", v)}
          typeTag="virtual-machine"
        />
      ),
    },
  ]

  const idmapRows: ConfigRowItem[] = [
    {
      key: "security_idmap_base",
      label: "security.idmap.base",
      description: "宿主机上的基础 ID，用于 UID/GID 映射的起始值",
      instanceType: "container",
      onReset: reset("security_idmap_base"),
      children: (
        <Input
          className="w-48"
          placeholder="自动分配"
          {...form.register("security_idmap_base")}
        />
      ),
    },
    {
      key: "security_idmap_size",
      label: "security.idmap.size",
      description: "ID 映射范围大小",
      instanceType: "container",
      onReset: reset("security_idmap_size"),
      children: (
        <Input
          type="number"
          className="w-32"
          min={0}
          placeholder="默认"
          value={form.watch("security_idmap_size") ?? ""}
          onChange={(e) =>
            form.setValue("security_idmap_size", e.target.value ? Number(e.target.value) : undefined)
          }
        />
      ),
    },
    {
      key: "security_idmap_isolated",
      label: "security.idmap.isolated",
      description: "为该实例使用独立的 ID 映射范围，不与其他实例共享",
      instanceType: "container",
      onReset: reset("security_idmap_isolated"),
      children: (
        <SwitchRow
          checked={form.watch("security_idmap_isolated")}
          onCheckedChange={(v) => form.setValue("security_idmap_isolated", v)}
          typeTag="container"
        />
      ),
    },
  ]

  const devlxdRows: ConfigRowItem[] = [
    {
      key: "security_devlxd",
      label: "security.devlxd",
      description: "允许实例访问 /dev/lxd 接口与宿主机通信",
      instanceType: "container",
      onReset: reset("security_devlxd"),
      children: (
        <SwitchRow
          checked={form.watch("security_devlxd")}
          onCheckedChange={(v) => form.setValue("security_devlxd", v)}
          typeTag="container"
        />
      ),
    },
    {
      key: "security_devlxd_images",
      label: "security.devlxd.images",
      description: "允许实例通过 /dev/lxd 访问宿主机镜像列表 (/1.0/images API)",
      instanceType: "container",
      onReset: reset("security_devlxd_images"),
      children: (
        <SwitchRow
          checked={form.watch("security_devlxd_images")}
          onCheckedChange={(v) => form.setValue("security_devlxd_images", v)}
          typeTag="container"
        />
      ),
    },
  ]

  return (
    <ConfigSection
      title="安全策略配置"
      description="配置实例的安全设置，包括特权模式、嵌套支持、ID 映射和高级安全选项"
    >
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-medium mb-1">基本安全设置</h3>
          <p className="text-xs text-muted-foreground mb-4">
            控制实例的基本安全策略和权限
          </p>
          <ConfigTable rows={privilegeRows} currentInstanceType={instanceType} />
        </div>

        {instanceType === "container" && (
          <>
            <div>
              <h3 className="text-sm font-medium mb-1">ID 映射</h3>
              <p className="text-xs text-muted-foreground mb-4">
                配置容器的 UID/GID 映射，用于隔离容器内的用户 ID
              </p>
              <ConfigTable rows={idmapRows} currentInstanceType={instanceType} />
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">/dev/lxd 访问控制</h3>
              <p className="text-xs text-muted-foreground mb-4">
                控制容器通过 /dev/lxd 接口与宿主机交互的权限
              </p>
              <ConfigTable rows={devlxdRows} currentInstanceType={instanceType} />
            </div>
          </>
        )}
      </div>
    </ConfigSection>
  )
}
