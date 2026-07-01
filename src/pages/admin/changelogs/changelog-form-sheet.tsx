import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminChangelogs, putAdminChangelogsById } from "@/api"
import type { CmschangelogCmsChangelogItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { RichTextEditor } from "@/components/rich-text-editor"

const formSchema = z.object({
  version: z.string().min(1, "版本号不能为空").max(50, "版本号不能超过 50 个字符"),
  content: z.string().min(1, "内容不能为空"),
  status: z.coerce.number().int(),
  published_at: z.string().optional().default(""),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  version: "",
  content: "",
  status: 1,
  published_at: "",
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function toDatetimeLocal(value?: string): string {
  if (!value) return ""
  return value.replace(" ", "T").slice(0, 16)
}

function ChangelogFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="version"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>版本号</FormLabel>
            <FormControl>
              <Input placeholder="例如 v1.0.0" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>内容</FormLabel>
            <FormControl>
              <RichTextEditor value={field.value} onChange={field.onChange} />
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
          name="published_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>发布时间</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}

export function ChangelogCreateSheet({
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
      const { data: res } = await postAdminChangelogs({
        body: {
          version: values.version,
          content: values.content,
          status: values.status,
          published_at: values.published_at ? values.published_at.replace("T", " ") + ":00" : undefined,
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
      title="添加日志"
      description="创建一条新的更新日志"
      footer={
        <Button form="changelog-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "提交中..." : "提交"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="changelog-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <ChangelogFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function ChangelogEditSheet({
  open,
  onOpenChange,
  changelog,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  changelog: CmschangelogCmsChangelogItem
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
        version: changelog.version ?? "",
        content: changelog.content ?? "",
        status: changelog.status ?? 1,
        published_at: toDatetimeLocal(changelog.published_at),
      })
    }
  }, [open, changelog, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminChangelogsById({
        path: { id: changelog.id! },
        body: {
          version: values.version,
          content: values.content,
          status: values.status,
          published_at: values.published_at ? values.published_at.replace("T", " ") + ":00" : null,
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
      title="编辑日志"
      description="修改更新日志内容"
      footer={
        <Button form="changelog-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="changelog-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <ChangelogFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
