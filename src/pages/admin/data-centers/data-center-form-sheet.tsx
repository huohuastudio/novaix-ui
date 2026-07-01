import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X } from "lucide-react"
import { postAdminDataCenters, putAdminDataCentersById } from "@/api"
import type { DatacenterinfoDataCenterInfoItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { ImageUploadField } from "@/components/image-upload-field"

const formSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(255, "名称不能超过 255 个字符"),
  city: z.string().min(1, "城市不能为空").max(255, "城市不能超过 255 个字符"),
  country: z.string().min(1, "国家/地区不能为空").max(255, "国家/地区不能超过 255 个字符"),
  description: z.string().max(1000, "描述不能超过 1000 个字符").optional().or(z.literal("")),
  features: z.string().optional().or(z.literal("")),
  test_ip: z.string().max(255, "测试 IP 不能超过 255 个字符").optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
  status: z.coerce.number().int(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  name: "",
  city: "",
  country: "",
  description: "",
  features: "",
  test_ip: "",
  image: "",
  status: 1,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function FeaturesTagInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [inputValue, setInputValue] = useState("")
  const tags = parseTags(value)

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    const current = parseTags(value)
    if (current.includes(trimmed)) return
    const newTags = [...current, trimmed]
    onChange(newTags.join(", "))
    setInputValue("")
  }

  const removeTag = (index: number) => {
    const current = parseTags(value)
    current.splice(index, 1)
    onChange(current.join(", "))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder="输入特性后按回车添加"
      />
    </div>
  )
}

function DataCenterFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>名称</FormLabel>
            <FormControl>
              <Input placeholder="输入数据中心名称" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>城市</FormLabel>
              <FormControl>
                <Input placeholder="如：上海" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>国家/地区</FormLabel>
              <FormControl>
                <Input placeholder="如：中国" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>描述</FormLabel>
            <FormControl>
              <Textarea placeholder="输入数据中心描述" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="features"
        render={({ field }) => (
          <FormItem>
            <FormLabel>特性</FormLabel>
            <FormControl>
              <FeaturesTagInput value={field.value ?? ""} onChange={field.onChange} />
            </FormControl>
            <FormDescription>输入特性标签后按回车添加，如：高带宽、低延迟、DDoS 防护</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="test_ip"
        render={({ field }) => (
          <FormItem>
            <FormLabel>测试 IP</FormLabel>
            <FormControl>
              <Input placeholder="输入测试 IP 地址" {...field} />
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
            <FormLabel>图片</FormLabel>
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

export function DataCenterCreateSheet({
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
      const features = parseTags(values.features ?? "")
      const { data: res } = await postAdminDataCenters({
        body: {
          name: values.name,
          city: values.city,
          country: values.country,
          description: values.description || undefined,
          features: features.length > 0 ? features : undefined,
          test_ip: values.test_ip || undefined,
          image: values.image || undefined,
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
      title="添加数据中心"
      description="添加一个新的数据中心"
      footer={
        <Button form="data-center-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "提交中..." : "提交"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="data-center-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DataCenterFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function DataCenterEditSheet({
  open,
  onOpenChange,
  dataCenter,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataCenter: DatacenterinfoDataCenterInfoItem
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
        name: dataCenter.name ?? "",
        city: dataCenter.city ?? "",
        country: dataCenter.country ?? "",
        description: dataCenter.description ?? "",
        features: dataCenter.features?.join(", ") ?? "",
        test_ip: dataCenter.test_ip ?? "",
        image: dataCenter.image ?? "",
        status: dataCenter.status ?? 1,
        sort_order: dataCenter.sort_order ?? 0,
      })
    }
  }, [open, dataCenter, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const features = parseTags(values.features ?? "")
      const { data: res } = await putAdminDataCentersById({
        path: { id: dataCenter.id! },
        body: {
          name: values.name,
          city: values.city,
          country: values.country,
          description: values.description,
          features,
          test_ip: values.test_ip,
          image: values.image,
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
      title="编辑数据中心"
      description="修改数据中心信息"
      footer={
        <Button form="data-center-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="data-center-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DataCenterFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
