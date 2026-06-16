import { useEffect, useState } from "react"
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
  profileToFormValues,
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
import { Skeleton } from "@/components/ui/skeleton"
import { FormSheet } from "@/components/form-sheet"
import type { IncusProfile } from "@/types/incus"

interface ProfileEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: number
  profileName: string
  onSuccess: () => void
}

export function ProfileEditSheet({
  open,
  onOpenChange,
  nodeId,
  profileName,
  onSuccess,
}: ProfileEditSheetProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="编辑配置文件"
      description={`修改配置文件「${profileName}」`}
    >
      <ProfileEditLoader
        nodeId={nodeId}
        profileName={profileName}
        onSuccess={onSuccess}
        onCancel={() => onOpenChange(false)}
      />
    </FormSheet>
  )
}

function ProfileEditLoader({
  nodeId,
  profileName,
  onSuccess,
  onCancel,
}: {
  nodeId: number
  profileName: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [profile, setProfile] = useState<IncusProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!nodeId || !profileName) {
      return
    }
    let cancelled = false
    incus<IncusProfile>(nodeId, `1.0/profiles/${profileName}`)
      .then((data) => { if (!cancelled) setProfile(data) })
      .catch(() => { if (!cancelled) setProfile(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [nodeId, profileName])

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-6">
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
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-muted-foreground">配置文件不存在或参数缺失</p>
        <Button variant="outline" onClick={onCancel}>返回</Button>
      </div>
    )
  }

  return (
    <ProfileEditForm
      profile={profile}
      nodeId={nodeId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}

function ProfileEditForm({
  profile,
  nodeId,
  onSuccess,
  onCancel,
}: {
  profile: IncusProfile
  nodeId: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const nodeResources = useNodeResources(nodeId)

  const form = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileFormSchema) as any,
    defaultValues: profileToFormValues(profile),
  })

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const body = buildProfileBody(values)
      await incus(nodeId, `1.0/profiles/${profile.name}`, {
        method: "PUT",
        body: { description: body.description, config: body.config, devices: body.devices },
      })
      toast.success("配置文件已保存")
      onSuccess()
    } catch (err) {
      toast.error(incusErrorMessage(err, "更新配置文件失败"))
    }
  }

  const onInvalid = (errors: Record<string, unknown>) => {
    console.error("表单验证失败", errors)
    toast.error("表单验证失败，请检查各配置项")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <ProfileFormLayout
          form={form}
          nodeResources={nodeResources}
          nodeId={nodeId}
          mainSection={
            <ConfigSection title="基本信息">
              <div className="space-y-6">
                <FormItem>
                  <FormLabel>配置文件名称</FormLabel>
                  <Input value={profile.name} disabled />
                  <FormDescription>配置文件名称创建后不可修改</FormDescription>
                </FormItem>
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
                {form.formState.isSubmitting ? "保存中..." : "保存修改"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => form.reset({
                  ...defaultValues,
                  name: profile.name,
                  description: profile.description ?? "",
                })}
              >
                重置所有配置
              </Button>
            </>
          }
        />
      </form>
    </Form>
  )
}
