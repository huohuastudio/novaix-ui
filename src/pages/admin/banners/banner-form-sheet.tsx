import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminBanners, putAdminBannersById } from "@/api"
import type { BannerBannerItem } from "@/api"
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
  title: z.string().min(1, "标题不能为空").max(255, "标题不能超过 255 个字符"),
  image: z.string().min(1, "图片不能为空"),
  description: z.string().max(1000, "描述不能超过 1000 个字符").optional().or(z.literal("")),
  url: z.string().max(2048, "链接不能超过 2048 个字符").optional().or(z.literal("")),
  target: z.string(),
  location: z.string().min(1, "位置不能为空"),
  status: z.coerce.number().int(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
  start_at: z.string().optional().or(z.literal("")),
  end_at: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  title: "",
  image: "",
  description: "",
  url: "",
  target: "_self",
  location: "",
  status: 1,
  sort_order: 0,
  start_at: "",
  end_at: "",
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function toServerDatetime(value: string): string | undefined {
  if (!value) return undefined
  return value.replace("T", " ") + ":00"
}

function toInputDatetime(value?: string): string {
  if (!value) return ""
  return value.slice(0, 16).replace(" ", "T")
}

function BannerFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>标题</FormLabel>
            <FormControl>
              <Input placeholder="输入轮播图标题" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>图片</FormLabel>
            <FormControl>
              <ImageUploadField value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>描述</FormLabel>
            <FormControl>
              <Textarea placeholder="输入轮播图描述（可选）" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>链接</FormLabel>
              <FormControl>
                <Input placeholder="点击跳转链接（可选）" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="target"
          render={({ field }) => (
            <FormItem>
              <FormLabel>打开方式</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_self">当前窗口</SelectItem>
                  <SelectItem value="_blank">新窗口</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>位置</FormLabel>
            <FormControl>
              <Input placeholder="输入位置标识，如 home_hero" {...field} />
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
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>开始时间</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>结束时间</FormLabel>
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

export function BannerCreateSheet({
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
      const { data: res } = await postAdminBanners({
        body: {
          title: values.title,
          image: values.image,
          location: values.location,
          description: values.description || undefined,
          url: values.url || undefined,
          target: values.target,
          status: values.status,
          sort_order: values.sort_order,
          start_at: toServerDatetime(values.start_at ?? ""),
          end_at: toServerDatetime(values.end_at ?? ""),
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
      title="新建轮播图"
      description="创建一个新的轮播横幅"
      footer={
        <Button form="banner-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "创建中..." : "创建"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="banner-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <BannerFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function BannerEditSheet({
  open,
  onOpenChange,
  banner,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  banner: BannerBannerItem
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
        title: banner.title ?? "",
        image: banner.image ?? "",
        description: banner.description ?? "",
        url: banner.url ?? "",
        target: banner.target ?? "_self",
        location: banner.location ?? "",
        status: banner.status ?? 1,
        sort_order: banner.sort_order ?? 0,
        start_at: toInputDatetime(banner.start_at),
        end_at: toInputDatetime(banner.end_at),
      })
    }
  }, [open, banner, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminBannersById({
        path: { id: banner.id! },
        body: {
          title: values.title,
          image: values.image,
          location: values.location,
          description: values.description,
          url: values.url,
          target: values.target,
          status: values.status,
          sort_order: values.sort_order,
          start_at: toServerDatetime(values.start_at ?? "") ?? null,
          end_at: toServerDatetime(values.end_at ?? "") ?? null,
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
      title="编辑轮播图"
      description="修改轮播横幅信息"
      footer={
        <Button form="banner-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="banner-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <BannerFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
