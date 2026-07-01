import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminArticles, putAdminArticlesById } from "@/api"
import type { ArticleArticleItem, ArticlecategoryArticleCategoryItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { ImageUploadField } from "@/components/image-upload-field"

const formSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(255, "标题不能超过 255 个字符"),
  slug: z.string().min(1, "别名不能为空").max(255, "别名不能超过 255 个字符"),
  type: z.enum(["news", "announcement", "activity"]),
  category_id: z.coerce.number().int().positive().optional(),
  summary: z.string().max(500, "摘要不能超过 500 个字符").optional().or(z.literal("")),
  content: z.string().min(1, "内容不能为空"),
  cover_image: z.string().optional().or(z.literal("")),
  status: z.coerce.number().int(),
  is_pinned: z.boolean(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
  published_at: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  title: "",
  slug: "",
  type: "news",
  category_id: undefined,
  summary: "",
  content: "",
  cover_image: "",
  status: 1,
  is_pinned: false,
  sort_order: 0,
  published_at: "",
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

const TYPE_OPTIONS = [
  { label: "新闻", value: "news" },
  { label: "公告", value: "announcement" },
  { label: "活动", value: "activity" },
] as const

function ArticleFormFields({
  form,
  categories,
  autoSlugDefault = true,
}: {
  form: ReturnType<typeof useForm<FormValues>>
  categories: ArticlecategoryArticleCategoryItem[]
  autoSlugDefault?: boolean
}) {
  const [autoSlug, setAutoSlug] = useState(autoSlugDefault)

  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>标题</FormLabel>
            <FormControl>
              <Input
                placeholder="输入文章标题"
                {...field}
                onChange={(e) => {
                  field.onChange(e)
                  if (autoSlug) {
                    const slug =
                      (e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9一-鿿]+/g, "-")
                        .replace(/^-|-$/g, "") || "article") +
                      "-" +
                      Date.now().toString(36)
                    form.setValue("slug", slug)
                  }
                }}
              />
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
              <Input
                placeholder="url-friendly-name"
                {...field}
                onChange={(e) => {
                  setAutoSlug(false)
                  field.onChange(e)
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>类型</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>分类</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === "__none__" ? undefined : Number(v))}
                value={field.value ? String(field.value) : "__none__"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">无分类</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="summary"
        render={({ field }) => (
          <FormItem>
            <FormLabel>摘要</FormLabel>
            <FormControl>
              <Textarea placeholder="输入文章摘要（可选）" rows={3} {...field} />
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
      <FormField
        control={form.control}
        name="cover_image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>封面图片</FormLabel>
            <FormControl>
              <ImageUploadField value={field.value} onChange={field.onChange} />
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
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="is_pinned"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>置顶</FormLabel>
                <FormDescription>将文章固定在列表顶部</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
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

export function ArticleCreateSheet({
  open,
  onOpenChange,
  onSuccess,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  categories: ArticlecategoryArticleCategoryItem[]
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
      const { data: res } = await postAdminArticles({
        body: {
          title: values.title,
          slug: values.slug,
          type: values.type,
          content: values.content,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          summary: values.summary || undefined,
          status: values.status,
          is_pinned: values.is_pinned,
          sort_order: values.sort_order,
          published_at: values.published_at || undefined,
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
      title="新建文章"
      description="创建一篇新的文章"
      footer={
        <Button form="article-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "创建中..." : "创建"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="article-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <ArticleFormFields form={form} categories={categories} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function ArticleEditSheet({
  open,
  onOpenChange,
  article,
  onSuccess,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: ArticleArticleItem
  onSuccess: () => void
  categories: ArticlecategoryArticleCategoryItem[]
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
        title: article.title ?? "",
        slug: article.slug ?? "",
        type: (article.type as FormValues["type"]) ?? "news",
        category_id: article.category_id ?? undefined,
        summary: article.summary ?? "",
        content: article.content ?? "",
        cover_image: article.cover_image ?? "",
        status: article.status ?? 1,
        is_pinned: article.is_pinned ?? false,
        sort_order: article.sort_order ?? 0,
        published_at: article.published_at
          ? article.published_at.slice(0, 16)
          : "",
      })
    }
  }, [open, article, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminArticlesById({
        path: { id: article.id! },
        body: {
          title: values.title,
          slug: values.slug,
          type: values.type,
          content: values.content,
          category_id: values.category_id ?? null,
          cover_image: values.cover_image,
          summary: values.summary,
          status: values.status,
          is_pinned: values.is_pinned,
          sort_order: values.sort_order,
          published_at: values.published_at || null,
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
      title="编辑文章"
      description="修改文章内容"
      footer={
        <Button form="article-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="article-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <ArticleFormFields form={form} categories={categories} autoSlugDefault={false} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
