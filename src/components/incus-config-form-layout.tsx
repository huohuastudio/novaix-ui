import type { UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
import type { NavItem } from "@/components/form-nav-layout"
import { FormNavLayout } from "@/components/form-nav-layout"
import {
  Settings,
  HardDrive,
  Database,
  Network,
  Gpu,
  Gauge,
  Shield,
  Camera,
  ArrowRightLeft,
  Power,
  Wrench,
  Cloud,
  Cable,
  Cpu,
} from "lucide-react"

import { DiskDeviceSection } from "@/pages/admin/instances/sections/device-disk"
import { VolumeDeviceSection } from "@/pages/admin/instances/sections/device-volume"
import { NetworkDeviceSection } from "@/pages/admin/instances/sections/device-network"
import { GpuDeviceSection } from "@/pages/admin/instances/sections/device-gpu"
import { ProxyDeviceSection } from "@/pages/admin/instances/sections/device-proxy"
import { OtherDeviceSection } from "@/pages/admin/instances/sections/device-other"
import { ResourceLimitsSection } from "@/pages/admin/instances/sections/resource-limits"
import { SecurityPoliciesSection } from "@/pages/admin/instances/sections/security-policies"
import { SnapshotsSection } from "@/pages/admin/instances/sections/snapshots"
import { MigrationSection } from "@/pages/admin/instances/sections/migration"
import { BootSection } from "@/pages/admin/instances/sections/boot"
import { AdvancedSection } from "@/pages/admin/instances/sections/advanced"
import { CloudInitSection } from "@/pages/admin/instances/sections/cloud-init"

const navItems: NavItem[] = [
  { id: "main", label: "基本信息", icon: Settings },
  { id: "disk", label: "磁盘", icon: HardDrive, group: "设备" },
  { id: "volume", label: "附加卷", icon: Database, group: "设备" },
  { id: "network", label: "网络", icon: Network, group: "设备" },
  { id: "gpu", label: "图形处理器", icon: Gpu, group: "设备" },
  { id: "proxy", label: "代理", icon: Cable, group: "设备" },
  { id: "other-devices", label: "其他设备", icon: Cpu, group: "设备" },
  { id: "resource-limits", label: "资源限制", icon: Gauge },
  { id: "security", label: "安全策略", icon: Shield },
  { id: "snapshots", label: "快照", icon: Camera },
  { id: "migration", label: "迁移", icon: ArrowRightLeft },
  { id: "boot", label: "引导", icon: Power },
  { id: "advanced", label: "高级", icon: Wrench },
  { id: "cloud-init", label: "Cloud Init", icon: Cloud },
]

interface IncusConfigFormLayoutProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  nodeResources: NodeResources
  nodeId?: number
  mainSection: React.ReactNode
  actions?: React.ReactNode
}

export function IncusConfigFormLayout({
  form,
  nodeResources,
  nodeId,
  mainSection,
  actions,
}: IncusConfigFormLayoutProps) {
  return (
    <FormNavLayout
      navItems={navItems}
      actions={actions}
      sections={{
        "main": mainSection,
        "disk": <DiskDeviceSection form={form} nodeResources={nodeResources} nodeId={nodeId} />,
        "volume": <VolumeDeviceSection form={form} nodeResources={nodeResources} nodeId={nodeId} />,
        "network": <NetworkDeviceSection form={form} nodeResources={nodeResources} nodeId={nodeId} />,
        "gpu": <GpuDeviceSection form={form} />,
        "proxy": <ProxyDeviceSection form={form} />,
        "other-devices": <OtherDeviceSection form={form} />,
        "resource-limits": <ResourceLimitsSection form={form} />,
        "security": <SecurityPoliciesSection form={form} />,
        "snapshots": <SnapshotsSection form={form} />,
        "migration": <MigrationSection form={form} />,
        "boot": <BootSection form={form} />,
        "advanced": <AdvancedSection form={form} />,
        "cloud-init": <CloudInitSection form={form} />,
      }}
    />
  )
}
