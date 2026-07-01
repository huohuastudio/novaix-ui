import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminTestimonials, putAdminTestimonialsById } from "@/api"
import type { TestimonialTestimonialItem } from "@/api"
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
  avatar: z.string().optional().or(z.literal("")),
  company: z.string().max(255, "公司名不能超过 255 个字符").optional().or(z.literal("")),
  position: z.string().max(255, "职位不能超过 255 个字符").optional().or(z.literal("")),
  content: z.string().min(1, "评价内容不能为空").max(2000, "评价内容不能超过 2000 个字符"),
  rating: z.coerce.number().int().min(1).max(5),
  status: z.coerce.number().int(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  name: "",
  avatar: "",
  company: "",
  position: "",
  content: "",
  rating: 5,
  status: 1,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function TestimonialFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>姓名</FormLabel>
            <FormControl>
              <Input placeholder="输入客户姓名" {...field} />
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
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>公司</FormLabel>
              <FormControl>
                <Input placeholder="输入公司名称" {...field} />
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
                <Input placeholder="输入职位" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>评价内容</FormLabel>
            <FormControl>
              <Textarea placeholder="输入客户评价内容" rows={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="rating"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>评分</FormLabel>
            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="5">5 星</SelectItem>
                <SelectItem value="4">4 星</SelectItem>
                <SelectItem value="3">3 星</SelectItem>
                <SelectItem value="2">2 星</SelectItem>
                <SelectItem value="1">1 星</SelectItem>
              </SelectContent>
            </Select>
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

export function TestimonialCreateSheet({
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
      const { data: res } = await postAdminTestimonials({
        body: {
          name: values.name,
          content: values.content,
          avatar: values.avatar || undefined,
          company: values.company || undefined,
          position: values.position || undefined,
          rating: values.rating,
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
      title="添加客户评价"
      description="添加一条新的客户评价"
      footer={
        <Button form="testimonial-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "提交中..." : "提交"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="testimonial-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TestimonialFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function TestimonialEditSheet({
  open,
  onOpenChange,
  testimonial,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  testimonial: TestimonialTestimonialItem
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
        name: testimonial.name ?? "",
        avatar: testimonial.avatar ?? "",
        company: testimonial.company ?? "",
        position: testimonial.position ?? "",
        content: testimonial.content ?? "",
        rating: testimonial.rating ?? 5,
        status: testimonial.status ?? 1,
        sort_order: testimonial.sort_order ?? 0,
      })
    }
  }, [open, testimonial, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminTestimonialsById({
        path: { id: testimonial.id! },
        body: {
          name: values.name,
          content: values.content,
          avatar: values.avatar,
          company: values.company,
          position: values.position,
          rating: values.rating,
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
      title="编辑客户评价"
      description="修改客户评价信息"
      footer={
        <Button form="testimonial-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="testimonial-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TestimonialFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
