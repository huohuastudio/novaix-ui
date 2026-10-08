import { useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminArticles, putAdminArticlesById } from "@/api"
import type { ArticleArticleItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
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

// ── Schema ──

const formSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(255, "标题不能超过 255 个字符"),
  slug: z.string().trim().min(1, "别名不能为空").max(255, "别名不能超过 255 个字符"),
  content: z.string().min(1, "内容不能为空"),
  status: z.coerce.number<number | string>().int(),
  sort_order: z.coerce.number<number | string>().int().min(0, "排序权重不能为负数"),
})

type FormInput = z.input<typeof formSchema>
type FormValues = z.output<typeof formSchema>

const defaultValues: FormValues = {
  title: "",
  slug: "",
  content: "",
  status: 1,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

// ── Shared form fields ──

function AnnouncementFormFields({ form, originalSlug }: {
  form: UseFormReturn<FormInput, unknown, FormValues>
  originalSlug?: string
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>标题</FormLabel>
            <FormControl>
              <Input placeholder="输入公告标题" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>别名 (Slug)</FormLabel>
            <FormControl>
              <Input placeholder="url-friendly-name" {...field} />
            </FormControl>
            <FormDescription>
              {originalSlug !== undefined && field.value.trim() !== originalSlug
                ? "修改别名后，原公告链接将失效，请同步更新已分享的链接。"
                : "用于公告详情链接，建议使用英文字母、数字和连字符。修改标题不会改变别名。"}
            </FormDescription>
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

// ── Create Sheet ──

export function AnnouncementCreateSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  if (!open) return null
  return <AnnouncementCreateForm onOpenChange={onOpenChange} onSuccess={onSuccess} />
}

function AnnouncementCreateForm({
  onOpenChange,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")
  const [initialSlug] = useState(() => `announcement-${crypto.randomUUID()}`)

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...defaultValues, slug: initialSlug },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await postAdminArticles({
        body: {
          ...values,
          type: 'announcement',
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
      open
      onOpenChange={onOpenChange}
      title="发布公告"
      description="创建一条新的站点公告"
      footer={
        <Button form="announcement-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "发布中..." : "发布"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="announcement-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <AnnouncementFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

// ── Edit Sheet ──

export function AnnouncementEditSheet({
  open,
  onOpenChange,
  announcement,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement: ArticleArticleItem
  onSuccess: () => void
}) {
  if (!open) return null
  return (
    <AnnouncementEditForm
      onOpenChange={onOpenChange}
      announcement={announcement}
      onSuccess={onSuccess}
    />
  )
}

function AnnouncementEditForm({
  onOpenChange,
  announcement,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void
  announcement: ArticleArticleItem
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: announcement.title ?? "",
      slug: announcement.slug ?? "",
      content: announcement.content ?? "",
      status: announcement.status ?? 1,
      sort_order: announcement.sort_order ?? 0,
    },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminArticlesById({
        path: { id: announcement.id! },
        body: values,
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
      open
      onOpenChange={onOpenChange}
      title="编辑公告"
      description="修改公告内容"
      footer={
        <Button form="announcement-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="announcement-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <AnnouncementFormFields form={form} originalSlug={announcement.slug ?? ""} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
