"use no memo";
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { getAdminInstancesById, putAdminInstancesById } from "@/api"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useNodeResources } from "@/hooks/use-node-resources"
import { InstanceFormLayout } from "@/pages/admin/instances/instance-form-layout"
import {
  NodeReadonly,
  TypeReadonly,
  ProfileSelector,
} from "@/components/incus-config-sections"
import { FormSheet } from "@/components/form-sheet"

interface InstanceEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  instanceId: number | null
  onSuccess: () => void
}

export function InstanceEditSheet({
  open,
  onOpenChange,
  instanceId,
  onSuccess,
}: InstanceEditSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="编辑实例"
      description="修改实例的配置"
    >
      {instanceId && (
        <InstanceEditLoader
          instanceId={instanceId}
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </FormSheet>
  )
}

function InstanceEditLoader({
  instanceId,
  onSuccess,
  onCancel,
}: {
  instanceId: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const [instance, setInstance] = useState<InstanceInstanceItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // loading 已在初始状态中设为 true，此处无需重复设置
    getAdminInstancesById({ path: { id: instanceId } })
      .then(({ data: res }) => {
        if (!cancelled && res?.code === 0 && res.data) {
          setInstance(res.data)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [instanceId])

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-muted-foreground">实例不存在或已被删除</p>
        <Button variant="outline" onClick={onCancel}>返回</Button>
      </div>
    )
  }

  return (
    <InstanceEditForm
      instance={instance}
      instanceId={instanceId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}

function InstanceEditForm({
  instance,
  instanceId,
  onSuccess,
  onCancel,
}: {
  instance: InstanceInstanceItem
  instanceId: number
  onSuccess: () => void
  onCancel: () => void
}) {
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
    const res = result.data ?? (result as unknown as { error: unknown }).error
    const serverRes = res as { code?: number; message?: string; data?: unknown } | undefined
    if (serverRes?.code !== 0) {
      handleServerErrors<InstanceFormValues>(serverRes, {
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
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            </>
          }
        />
      </form>
    </Form>
  )
}
