"use no memo";
import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { postAdminInstances } from "@/api"
import type { NodeNodeItem } from "@/api"
import { handleServerErrors } from "@/lib/form-utils"
import { useTasks } from "@/hooks/use-tasks"
import { instanceFormSchema, defaultValues, buildCreateBody, fieldNames } from "../schema"
import type { InstanceFormValues } from "../schema"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ConfigSection } from "@/components/config-table"
import { useNodeResources } from "@/hooks/use-node-resources"
import { InstanceFormLayout } from "../instance-form-layout"
import {
  NodeSelector,
  NodeReadonly,
  TypeSelector,
  ProfileSelector,
  ImageSource,
  IPSelector,
} from "@/components/incus-config-sections"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useAdminPath } from "@/hooks/use-site-settings"

export default function CreateInstance() {
  const adminPath = useAdminPath()
  useBreadcrumb([
    { label: "实例管理", href: `${adminPath}/instances` },
    { label: "创建实例" },
  ])
  const navigate = useNavigate()
  const { addTask } = useTasks()
  const [searchParams] = useSearchParams()
  const presetNodeId = searchParams.get("node_id") ? Number(searchParams.get("node_id")) : undefined

  const form = useForm<InstanceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(instanceFormSchema) as any,
    defaultValues: presetNodeId ? { ...defaultValues, node_id: presetNodeId } : defaultValues,
  })

  const selectedNodeId = form.watch("node_id")
  const nodeResources = useNodeResources(selectedNodeId || undefined)

  const handleNodeSwitch = (node: NodeNodeItem) => {
    form.setValue("disk_pool", node.storage_pool ?? "")
    form.setValue("network_name", node.network_name ?? "")
    form.setValue("network_device_name", "eth0")
    form.setValue("profiles", "")
  }

  const onSubmit = async (values: InstanceFormValues) => {
    const body = buildCreateBody(values)
    const result = await postAdminInstances({ body })
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
    const taskId = res?.data?.create_task_id
    if (taskId) {
      addTask(taskId, "create_instance")
      toast.success("实例创建任务已提交", { description: `任务 #${taskId} 正在后台执行` })
    }
    navigate(`${adminPath}/instances`)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">创建实例</h1>
          <HelpLink path="/novaix/instance" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          配置和创建新的容器或虚拟机实例
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <InstanceFormLayout
            form={form}
            nodeResources={nodeResources}
            mainSection={
              <ConfigSection title="主要配置">
                <div className="space-y-6">
                  <div data-tour="create-instance-node">
                  {presetNodeId ? (
                    <NodeReadonly nodeId={presetNodeId} description="从节点详情页进入，已自动选择宿主机" />
                  ) : (
                    <NodeSelector form={form} onNodeSwitch={handleNodeSwitch} />
                  )}
                  </div>
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

                  <div data-tour="create-instance-type">
                    <TypeSelector form={form} />
                  </div>
                  <div data-tour="create-instance-image">
                    <ImageSource form={form} />
                  </div>
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
                  {form.formState.isSubmitting ? "创建中..." : "创建实例"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`${adminPath}/instances`)}>
                  取消
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset(presetNodeId ? { ...defaultValues, node_id: presetNodeId } : defaultValues)}
                >
                  重置为默认
                </Button>
              </>
            }
          />
        </form>
      </Form>
    </div>
  )
}
