import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminBrandAssets, putAdminBrandAssetsById } from "@/api"
import type { BrandassetBrandAssetItem } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
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
import { FormSheet } from "@/components/form-sheet"
import { ImageUploadField } from "@/components/image-upload-field"

const formSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(255, "名称不能超过 255 个字符"),
  file_url: z.string().min(1, "文件地址不能为空"),
  description: z.string().optional().default(""),
  file_size: z.coerce.number().int().min(0).optional(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  name: "",
  file_url: "",
  description: "",
  file_size: undefined,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function BrandAssetFormFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>名称</FormLabel>
            <FormControl>
              <Input placeholder="输入素材名称" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="file_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>文件</FormLabel>
            <FormControl>
              <ImageUploadField
                value={field.value}
                onChange={field.onChange}
                onUploaded={(file) => form.setValue("file_size", file.size)}
                accept="image/jpeg,image/png,image/gif,image/webp,image/x-icon,application/pdf"
                placeholder="输入文件 URL 或点击上传"
              />
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
              <Textarea placeholder="输入素材描述（可选）" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="file_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>文件大小</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="字节数"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormControl>
              <FormDescription>单位为字节，上传后可自动获取</FormDescription>
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

export function BrandAssetCreateSheet({
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
      const { data: res } = await postAdminBrandAssets({
        body: {
          name: values.name,
          file_url: values.file_url,
          description: values.description || undefined,
          file_size: values.file_size ?? undefined,
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
      title="添加素材"
      description="创建一个新的品牌素材"
      footer={
        <Button form="brand-asset-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "提交中..." : "提交"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="brand-asset-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <BrandAssetFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function BrandAssetEditSheet({
  open,
  onOpenChange,
  brandAsset,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandAsset: BrandassetBrandAssetItem
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
        name: brandAsset.name ?? "",
        file_url: brandAsset.file_url ?? "",
        description: brandAsset.description ?? "",
        file_size: brandAsset.file_size ?? undefined,
        sort_order: brandAsset.sort_order ?? 0,
      })
    }
  }, [open, brandAsset, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminBrandAssetsById({
        path: { id: brandAsset.id! },
        body: {
          name: values.name,
          file_url: values.file_url,
          description: values.description,
          file_size: values.file_size ?? 0,
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
      title="编辑素材"
      description="修改品牌素材信息"
      footer={
        <Button form="brand-asset-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="brand-asset-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <BrandAssetFormFields form={form} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
