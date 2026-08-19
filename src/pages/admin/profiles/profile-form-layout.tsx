import type { UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
import { asIncusConfigForm } from "@/types/incus-config"
import { IncusConfigFormLayout } from "@/components/incus-config-form-layout"
import type { ProfileFormValues } from "./schema"

interface ProfileFormLayoutProps {
  form: UseFormReturn<ProfileFormValues>
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
      form={asIncusConfigForm(form)}
      nodeResources={nodeResources}
      nodeId={nodeId}
      mainSection={mainSection}
      actions={actions}
      mode="profile"
    />
  )
}
