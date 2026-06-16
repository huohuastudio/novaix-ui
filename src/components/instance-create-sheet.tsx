import { useForm } from "react-hook-form"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { postAdminInstances } from "@/api"
import { handleServerErrors } from "@/lib/form-utils"
import { useTasks } from "@/hooks/use-tasks"
import { instanceFormSchema, defaultValues, buildCreateBody, fieldNames } from "@/pages/admin/instances/schema"
import type { InstanceFormValues } from "@/pages/admin/instances/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
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
  TypeSelector,
  ProfileSelector,
  ImageSource,
  IPSelector,
} from "@/components/incus-config-sections"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormSheet } from "@/components/form-sheet"

interface InstanceCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: number
  onSuccess: () => void
}

export function InstanceCreateSheet({
  open,
  onOpenChange,
  nodeId,
  onSuccess,
}: InstanceCreateSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="创建实例"
      description="配置和创建新的容器或虚拟机实例"
    >
      <InstanceCreateForm
        nodeId={nodeId}
        onSuccess={onSuccess}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  )
}

function InstanceCreateForm({
  nodeId,
  onSuccess,
  onCancel,
}: {
  nodeId: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const { addTask } = useTasks()

  const form = useForm<InstanceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(instanceFormSchema) as any,
    defaultValues: { ...defaultValues, node_id: nodeId },
  })

  const nodeResources = useNodeResources(nodeId)

  const onSubmit = async (values: InstanceFormValues) => {
    const body = buildCreateBody(values)
    const result = await postAdminInstances({ body })
    const res = result.data ?? (result as unknown as { error: unknown }).error
    const serverRes = res as { code?: number; message?: string; data?: unknown } | undefined
    if (serverRes?.code !== 0) {
      handleServerErrors<InstanceFormValues>(serverRes, {
        setError: form.setError,
        fieldNames,
      })
      return
    }
    const taskId = (serverRes?.data as Record<string, unknown> | undefined)?.create_task_id as number | undefined
    if (taskId) {
      addTask(taskId, "create_instance")
      toast.success("实例创建任务已提交", { description: `任务 #${taskId} 正在后台执行` })
    }
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <InstanceFormLayout
          form={form}
          nodeResources={nodeResources}
          mainSection={
            <ConfigSection title="主要配置">
              <div className="space-y-6">
                <NodeReadonly nodeId={nodeId} description="从节点详情页进入，已自动选择宿主机" />
                <IPSelector form={form} />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>实例名称</FormLabel>
                      <FormControl>
                        <Input placeholder="输入实例名称" {...field} />
                      </FormControl>
                      <FormDescription>实例名称必须唯一，只能包含字母、数字和连字符</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TypeSelector form={form} />
                <ImageSource form={form} />
                <ProfileSelector form={form} nodeResources={nodeResources} nodeId={nodeId} />

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
                          <Input type="password" placeholder="设置实例密码" {...field} />
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
                {form.formState.isSubmitting ? "创建中..." : "创建实例"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => form.reset({ ...defaultValues, node_id: nodeId })}
              >
                重置为默认
              </Button>
            </>
          }
        />
      </form>
    </Form>
  )
}
