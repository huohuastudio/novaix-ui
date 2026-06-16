"use no memo";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { putAdminInstancesById } from "@/api"
import type { InstanceInstanceItem } from "@/api"
import { handleServerErrors } from "@/lib/form-utils"
import { instanceFormSchema, fieldNames, buildUpdateBody, instanceToFormValues } from "@/pages/admin/instances/schema"
import type { InstanceFormValues } from "@/pages/admin/instances/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ConfigSection } from "@/components/config-table"
import { useNodeResources } from "@/hooks/use-node-resources"
import { InstanceFormLayout } from "@/pages/admin/instances/instance-form-layout"
import {
  NodeReadonly,
  TypeReadonly,
  ProfileSelector,
} from "@/components/incus-config-sections"

interface InstanceEditInlineProps {
  instanceId: number
  instance: InstanceInstanceItem
  onSuccess: () => void
}

export function InstanceEditInline({ instanceId, instance, onSuccess }: InstanceEditInlineProps) {
  const form = useForm<InstanceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(instanceFormSchema) as any,
    defaultValues: instanceToFormValues(instance),
  })

  const selectedNodeId = form.watch("node_id")
  const instanceType = form.watch("type")
  const nodeResources = useNodeResources(selectedNodeId || undefined)

  const onSubmit = async (values: InstanceFormValues) => {
    const body = buildUpdateBody(values)
    const result = await putAdminInstancesById({ path: { id: instanceId }, body })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = result.data ?? (result as any).error
    if (res?.code !== 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleServerErrors<InstanceFormValues>(res as any, {
        setError: form.setError,
        fieldNames,
      })
      return
    }
    toast.success("实例配置已保存")
    onSuccess()
  }

  const onInvalid = () => {
    toast.error("表单验证失败，请检查各配置项")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <InstanceFormLayout
          form={form}
          nodeResources={nodeResources}
          mainSection={
            <ConfigSection title="主要配置">
              <div className="space-y-6">
                <NodeReadonly nodeId={selectedNodeId} description="实例创建后不可更改宿主机节点" />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>实例名称</FormLabel>
                      <FormControl>
                        <Input placeholder="输入实例名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TypeReadonly type={instanceType} />
                <ProfileSelector form={form} nodeResources={nodeResources} nodeId={selectedNodeId || undefined} />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>描述</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="输入实例描述（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hostname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>主机名</FormLabel>
                        <FormControl>
                          <Input placeholder="留空则使用实例名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>密码</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="留空则不修改" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ConfigSection>
          }
          actions={
            <>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                {form.formState.isSubmitting ? "保存中..." : "保存修改"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset(instanceToFormValues(instance))}
              >
                重置
              </Button>
            </>
          }
        />
      </form>
    </Form>
  )
}
