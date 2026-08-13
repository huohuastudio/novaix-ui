"use no memo";
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { getAdminPlans, postAdminInstances } from "@/api"
import type { NodeNodeItem, ProductPlanItem } from "@/api"
import { handleCatchError, handleServerErrors, unwrapResponse } from "@/lib/form-utils"
import { useTasks } from "@/hooks/use-tasks"
import { instanceFormSchema, defaultValues, buildCreateBody, fieldNames } from "../schema"
import { asIncusConfigForm } from "@/types/incus-config"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    resolver: zodResolver(instanceFormSchema),
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

  // 套餐导入相关状态
  const [plans, setPlans] = useState<ProductPlanItem[]>([])
  const [plansLoaded, setPlansLoaded] = useState(false)

  // 首次展开下拉时加载套餐列表
  const loadPlans = async () => {
    if (plansLoaded) return
    try {
      const { data: res } = await getAdminPlans({ query: { page: 1, page_size: 100 } })
      setPlans(res?.data?.items ?? [])
    } catch { /* ignore */ }
    setPlansLoaded(true)
  }

  // 选择套餐后自动填充资源配置
  const handleImportPlan = (planId: string) => {
    const plan = plans.find(p => String(p.id) === planId)
    if (!plan) return
    form.setValue("cpu", plan.cpu ?? 1)
    form.setValue("memory", plan.memory ?? 512)
    form.setValue("disk", plan.disk ?? 10)
    form.setValue("bandwidth", plan.bandwidth ?? 0)
    form.setValue("traffic_limit", plan.traffic ?? 0)
    toast.success(`已导入套餐「${plan.name}」的配置`)
  }

  const onSubmit = async (values: InstanceFormValues) => {
    try {
      const body = buildCreateBody(values)
      const result = await postAdminInstances({ body })
      const res = unwrapResponse(result)
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          fieldNames,
        })
        return
      }
      const taskId = (res?.data as Record<string, unknown> | undefined)?.create_task_id as number | undefined
      if (taskId) {
        addTask(taskId, "create_instance")
        toast.success("实例创建任务已提交", { description: `任务 #${taskId} 正在后台执行` })
      }
      navigate(`${adminPath}/instances`)
    } catch (err) {
      handleCatchError(err, "创建实例失败", {
        setError: form.setError,
        fieldNames,
      })
    }
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
              <>
              <div className="max-w-2xl mb-6">
                <label className="text-sm font-medium">从套餐导入配置</label>
                <p className="text-xs text-muted-foreground mt-1">选择套餐后自动填充 CPU、内存、磁盘等资源配置</p>
                <Select onValueChange={handleImportPlan} onOpenChange={() => loadPlans()}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="选择套餐..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={String(plan.id)}>
                        {plan.name} ({plan.cpu}核 / {plan.memory}MB / {plan.disk}GB)
                      </SelectItem>
                    ))}
                    {plansLoaded && plans.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">暂无套餐</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
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
                    <TypeSelector form={asIncusConfigForm(form)} />
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
              </>
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
