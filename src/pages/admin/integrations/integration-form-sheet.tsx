import { useEffect, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminIntegrations, putAdminIntegrationsById } from "@/api"
import type { IntegrationIntegrationResponse } from "@/api"
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
import { FormSheet } from "@/components/form-sheet"
import { RevealOnceDialog } from "@/components/reveal-once-dialog"

const baseSchema = {
  name: z.string().min(1, "名称不能为空").max(128, "名称不能超过 128 个字符"),
  callback_url: z.string().max(512, "回调地址不能超过 512 个字符").optional().or(z.literal("")),
  description: z.string().max(512, "描述不能超过 512 个字符").optional().or(z.literal("")),
}

const createSchema = z.object(baseSchema)
const editSchema = z.object({
  ...baseSchema,
  rotate_callback: z.boolean().optional(),
  status: z.coerce.number().int(),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

const createFieldNames: (keyof CreateFormValues)[] = ["name", "callback_url", "description"]
const editFieldNames: (keyof EditFormValues)[] = ["name", "callback_url", "description", "status", "rotate_callback"]

export function IntegrationCreateSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")
  const [revealed, setRevealed] = useState<{ name: string; secret: string } | null>(null)

  const form = useForm<CreateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSchema) as any,
    defaultValues: { name: "", callback_url: "", description: "" },
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({ name: "", callback_url: "", description: "" })
    }
  }, [open, form])

  const onSubmit = async (values: CreateFormValues) => {
    setServerError("")
    try {
      const { data: res } = await postAdminIntegrations({
        body: {
          name: values.name,
          callback_url: values.callback_url || undefined,
          description: values.description || undefined,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames: createFieldNames,
        })
        return
      }
      const secret = res.data?.callback_secret
      onOpenChange(false)
      onSuccess()
      if (secret) {
        setRevealed({ name: values.name, secret })
      }
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames: createFieldNames })
    }
  }

  return (
    <>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title="新建集成方"
        description="集成方是第三方系统的稳定身份，API 密钥可关联到此身份"
        footer={
          <Button form="integration-create-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "创建中..." : "创建"}
          </Button>
        }
      >
        <Form {...form}>
          <form id="integration-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <IntegrationBaseFields form={form} />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          </form>
        </Form>
      </FormSheet>
      <RevealOnceDialog
        open={!!revealed}
        onOpenChange={(o) => !o && setRevealed(null)}
        title="集成方已创建"
        description={`集成方「${revealed?.name ?? ""}」已创建。请妥善保存下面的 callback_secret，仅展示这一次。`}
        value={revealed?.secret ?? ""}
      />
    </>
  )
}

export function IntegrationEditSheet({
  open,
  onOpenChange,
  integration,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  integration: IntegrationIntegrationResponse
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")
  const [revealed, setRevealed] = useState<{ name: string; secret: string } | null>(null)

  const form = useForm<EditFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      name: integration.name ?? "",
      callback_url: integration.callback_url ?? "",
      description: integration.description ?? "",
      status: integration.status ?? 1,
      rotate_callback: false,
    },
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({
        name: integration.name ?? "",
        callback_url: integration.callback_url ?? "",
        description: integration.description ?? "",
        status: integration.status ?? 1,
        rotate_callback: false,
      })
    }
  }, [open, integration, form])

  const onSubmit = async (values: EditFormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminIntegrationsById({
        path: { id: integration.id! },
        body: {
          name: values.name,
          callback_url: values.callback_url || "",
          description: values.description || "",
          status: values.status,
          rotate_callback: values.rotate_callback,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames: editFieldNames,
        })
        return
      }
      const secret = res.data?.callback_secret
      onOpenChange(false)
      onSuccess()
      if (secret && values.rotate_callback) {
        setRevealed({ name: values.name, secret })
      }
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames: editFieldNames })
    }
  }

  return (
    <>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title="编辑集成方"
        description="修改集成方配置或轮换签名密钥"
        footer={
          <Button form="integration-edit-form" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "保存中..." : "保存"}
          </Button>
        }
      >
        <Form {...form}>
          <form id="integration-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <IntegrationBaseFields form={form} />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">启用</FormLabel>
                    <FormDescription>禁用后不再发送 Webhook 回调</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 1}
                      onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rotate_callback"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">轮换 callback_secret</FormLabel>
                    <FormDescription>生成新的回调签名密钥，旧密钥立即失效</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          </form>
        </Form>
      </FormSheet>
      <RevealOnceDialog
        open={!!revealed}
        onOpenChange={(o) => !o && setRevealed(null)}
        title="新的 Callback Secret"
        description={`集成方「${revealed?.name ?? ""}」的 callback_secret 已轮换。旧密钥立即失效，请用新密钥更新接收端配置。`}
        value={revealed?.secret ?? ""}
      />
    </>
  )
}

// 创建与编辑共享的基础字段
function IntegrationBaseFields({
  form,
}: {
  // 两个 schema 共享相同的 name/callback_url/description 字段，因此 form 类型能兼容
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>名称</FormLabel>
            <FormControl>
              <Input placeholder="如 魔方主站 / WHMCS 主站" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="callback_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Webhook 回调地址</FormLabel>
            <FormControl>
              <Input placeholder="https://billing.example.com/callback" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormDescription>任务完成时通知集成方。留空则不发送回调。</FormDescription>
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
              <Textarea placeholder="可选" rows={2} {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
