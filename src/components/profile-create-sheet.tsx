import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { incus, incusErrorMessage } from "@/lib/incus"
import { useNodeResources } from "@/hooks/use-node-resources"
import {
  profileFormSchema,
  defaultValues,
  buildProfileBody,
} from "@/pages/admin/profiles/schema"
import type { ProfileFormValues } from "@/pages/admin/profiles/schema"
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
import { ProfileFormLayout } from "@/pages/admin/profiles/profile-form-layout"
import { TypeSelector } from "@/components/incus-config-sections"
import { FormSheet } from "@/components/form-sheet"

interface ProfileCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: number
  onSuccess: () => void
}

export function ProfileCreateSheet({
  open,
  onOpenChange,
  nodeId,
  onSuccess,
}: ProfileCreateSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="创建配置文件"
      description="在节点上创建新的配置文件"
    >
      <ProfileCreateForm
        nodeId={nodeId}
        onSuccess={onSuccess}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  )
}

function ProfileCreateForm({
  nodeId,
  onSuccess,
  onCancel,
}: {
  nodeId: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const nodeResources = useNodeResources(nodeId)

  const form = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileFormSchema) as any,
    defaultValues,
  })

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const body = buildProfileBody(values)
      await incus(nodeId, "1.0/profiles", { method: "POST", body })
      toast.success("配置文件已创建")
      onSuccess()
    } catch (err) {
      toast.error(incusErrorMessage(err, "创建配置文件失败"))
    }
  }

  return (
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
                {form.formState.isSubmitting && <Spinner />}
                {form.formState.isSubmitting ? "创建中..." : "创建配置文件"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
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
  )
}
