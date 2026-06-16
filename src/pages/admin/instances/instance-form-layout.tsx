import type { UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
import { IncusConfigFormLayout } from "@/components/incus-config-form-layout"

interface InstanceFormLayoutProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  nodeResources: NodeResources
  mainSection: React.ReactNode
  actions?: React.ReactNode
}

export function InstanceFormLayout({
  form,
  nodeResources,
  mainSection,
  actions,
}: InstanceFormLayoutProps) {
  return (
    <IncusConfigFormLayout
      form={form}
      nodeResources={nodeResources}
      mainSection={mainSection}
      actions={actions}
    />
  )
}
