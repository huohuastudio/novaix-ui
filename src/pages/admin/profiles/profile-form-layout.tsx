import type { UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
import { IncusConfigFormLayout } from "@/components/incus-config-form-layout"

interface ProfileFormLayoutProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  nodeResources: NodeResources
  nodeId: number
  mainSection: React.ReactNode
  actions?: React.ReactNode
}

export function ProfileFormLayout({
  form,
  nodeResources,
  nodeId,
  mainSection,
  actions,
}: ProfileFormLayoutProps) {
  return (
    <IncusConfigFormLayout
      form={form}
      nodeResources={nodeResources}
      nodeId={nodeId}
      mainSection={mainSection}
      actions={actions}
    />
  )
}
