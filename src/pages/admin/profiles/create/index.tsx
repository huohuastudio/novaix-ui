import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { incus, incusErrorMessage } from "@/lib/incus"
import { useNodeResources } from "@/hooks/use-node-resources"
import { profileFormSchema, defaultValues, buildProfileBody } from "../schema"
import type { ProfileFormValues } from "../schema"
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
import { ProfileFormLayout } from "../profile-form-layout"
import { TypeSelector } from "@/components/incus-config-sections"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useAdminPath } from "@/hooks/use-site-settings"

export default function CreateProfile() {
  const adminPath = useAdminPath()
  useBreadcrumb([
    { label: "配置文件", href: `${adminPath}/profiles` },
    { label: "创建配置文件" },
  ])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nodeId = Number(searchParams.get("node_id"))
  const nodeResources = useNodeResources(nodeId || undefined)

  const form = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileFormSchema) as any,
    defaultValues,
  })

  const onSubmit = async (values: ProfileFormValues) => {
    if (!nodeId) {
      toast.error("缺少节点 ID")
      return
    }
    try {
      const body = buildProfileBody(values)
      await incus(nodeId, "1.0/profiles", { method: "POST", body })
      toast.success("配置文件已创建")
      navigate(`${adminPath}/nodes/${nodeId}/profiles`)
    } catch (err) {
      toast.error(incusErrorMessage(err, "创建配置文件失败"))
    }
  }

  if (!nodeId) {
    return (
      <div className="flex-1 px-6 py-20 text-center text-muted-foreground">
        缺少节点参数，请从节点详情页进入
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">创建配置文件</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          在节点上创建新的配置文件
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ProfileFormLayout
            form={form}
            nodeResources={nodeResources}
            nodeId={nodeId}
            mainSection={
              <ConfigSection title="基本信息">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>配置文件名称</FormLabel>
                        <FormControl>
                          <Input placeholder="输入配置文件名称" {...field} />
                        </FormControl>
                        <FormDescription>配置文件的唯一标识名称</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <TypeSelector form={form} />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>描述</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="输入配置文件描述（可选）" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ConfigSection>
            }
            actions={
              <>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "创建中..." : "创建配置文件"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  取消
                </Button>
                <Button type="button" variant="ghost" onClick={() => form.reset(defaultValues)}>
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
