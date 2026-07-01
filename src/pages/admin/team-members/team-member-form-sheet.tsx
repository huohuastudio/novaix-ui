import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminTeamMembers, putAdminTeamMembersById } from "@/api"
import type { TeammemberTeamMemberItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormSheet } from "@/components/form-sheet"
import { ImageUploadField } from "@/components/image-upload-field"

const formSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(255, "姓名不能超过 255 个字符"),
  avatar: z.string().optional().default(""),
  position: z.string().optional().default(""),
  bio: z.string().optional().default(""),
  status: z.coerce.number().int(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  name: "",
  avatar: "",
  position: "",
  bio: "",
  status: 1,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function TeamMemberFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>姓名</FormLabel>
            <FormControl>
              <Input placeholder="输入成员姓名" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="avatar"
        render={({ field }) => (
          <FormItem>
            <FormLabel>头像</FormLabel>
            <FormControl>
              <ImageUploadField value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="position"
        render={({ field }) => (
          <FormItem>
            <FormLabel>职位</FormLabel>
            <FormControl>
              <Input placeholder="输入职位（可选）" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel>简介</FormLabel>
            <FormControl>
              <Textarea placeholder="输入个人简介（可选）" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>状态</FormLabel>
              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">显示</SelectItem>
                  <SelectItem value="0">隐藏</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>排序权重</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="0" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}

export function TeamMemberCreateSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset(defaultValues)
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await postAdminTeamMembers({
        body: {
          name: values.name,
          avatar: values.avatar || undefined,
          position: values.position || undefined,
          bio: values.bio || undefined,
          status: values.status,
          sort_order: values.sort_order,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames,
        })
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="添加成员"
      description="创建一位新的团队成员"
      footer={
        <Button form="team-member-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "提交中..." : "提交"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="team-member-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TeamMemberFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function TeamMemberEditSheet({
  open,
  onOpenChange,
  teamMember,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamMember: TeammemberTeamMemberItem
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({
        name: teamMember.name ?? "",
        avatar: teamMember.avatar ?? "",
        position: teamMember.position ?? "",
        bio: teamMember.bio ?? "",
        status: teamMember.status ?? 1,
        sort_order: teamMember.sort_order ?? 0,
      })
    }
  }, [open, teamMember, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminTeamMembersById({
        path: { id: teamMember.id! },
        body: {
          name: values.name,
          avatar: values.avatar,
          position: values.position,
          bio: values.bio,
          status: values.status,
          sort_order: values.sort_order,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames,
        })
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="编辑成员"
      description="修改团队成员信息"
      footer={
        <Button form="team-member-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="team-member-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TeamMemberFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
