import type { UseFormReturn } from "react-hook-form"
import type { NodeResources } from "@/hooks/use-node-resources"
import { asIncusConfigForm } from "@/types/incus-config"
import { IncusConfigFormLayout } from "@/components/incus-config-form-layout"
import type { InstanceFormValues } from "./schema"

interface InstanceFormLayoutProps {
  form: UseFormReturn<InstanceFormValues>
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
      form={asIncusConfigForm(form)}
      nodeResources={nodeResources}
      mainSection={mainSection}
      actions={actions}
    />
  )
}
