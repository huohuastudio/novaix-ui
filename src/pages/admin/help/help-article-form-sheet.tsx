import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminHelpArticles, putAdminHelpArticlesById } from "@/api"
import type { HelparticleHelpArticleItem, HelpcategoryHelpCategoryItem } from "@/api"
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
  title: z.string().min(1, "标题不能为空").max(255, "标题不能超过 255 个字符"),
  slug: z.string().min(1, "Slug 不能为空").max(255, "Slug 不能超过 255 个字符"),
  category_id: z.coerce.number().int().min(1, "请选择分类"),
  content: z.string().min(1, "内容不能为空"),
  status: z.coerce.number().int(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  title: "",
  slug: "",
  category_id: 0,
  content: "",
  status: 1,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿]+/g, "-")
      .replace(/^-|-$/g, "") || "help"
  ) + `-${Date.now().toString(36)}`
}

function HelpArticleFormFields({
  form,
  categories,
  autoSlug,
}: {
  form: ReturnType<typeof useForm<FormValues>>
  categories: HelpcategoryHelpCategoryItem[]
  autoSlug?: boolean
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
              <Input
                placeholder="输入文章标题"
                {...field}
                onChange={(e) => {
                  field.onChange(e)
                  if (autoSlug) {
                    form.setValue("slug", generateSlug(e.target.value))
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
            <FormLabel required>Slug</FormLabel>
            <FormControl>
              <Input placeholder="url-friendly-slug" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="category_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>分类</FormLabel>
            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
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

export function HelpArticleCreateSheet({
  open,
  onOpenChange,
  onSuccess,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  categories: HelpcategoryHelpCategoryItem[]
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
      const { data: res } = await postAdminHelpArticles({
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
      open={open}
      onOpenChange={onOpenChange}
      title="添加文章"
      description="创建一篇新的帮助文章"
      footer={
        <Button form="help-article-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="help-article-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <HelpArticleFormFields form={form} categories={categories} autoSlug />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function HelpArticleEditSheet({
  open,
  onOpenChange,
  article,
  onSuccess,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: HelparticleHelpArticleItem
  onSuccess: () => void
  categories: HelpcategoryHelpCategoryItem[]
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
        category_id: article.category_id ?? 0,
        content: article.content ?? "",
        status: article.status ?? 1,
        sort_order: article.sort_order ?? 0,
      })
    }
  }, [open, article, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminHelpArticlesById({
        path: { id: article.id! },
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
      open={open}
      onOpenChange={onOpenChange}
      title="编辑文章"
      description="修改帮助文章内容"
      footer={
        <Button form="help-article-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="help-article-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <HelpArticleFormFields form={form} categories={categories} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
