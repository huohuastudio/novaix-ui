import { useEffect, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminUsers, putAdminUsersById } from "@/api"
import type { UserUserItem } from "@/api"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ── Schema ──

const createSchema = z.object({
  username: z.string().min(2, "用户名至少 2 个字符").max(64, "用户名不能超过 64 个字符"),
  email: z.union([z.literal(""), z.string().email("请输入有效的邮箱地址").max(255, "邮箱不能超过 255 个字符")]),
  phone: z.string().max(20, "手机号不能超过 20 位").regex(/^\d*$/, "手机号只能是数字"),
  password: z.string().min(6, "密码至少 6 个字符").max(72, "密码不能超过 72 个字符"),
  role: z.enum(["admin", "agent", "user"]),
  status: z.coerce.number().int(),
})

const updateSchema = createSchema.extend({
  password: z.string().max(72, "密码不能超过 72 个字符").optional().default(""),
})

type CreateFormValues = z.infer<typeof createSchema>
type UpdateFormValues = z.infer<typeof updateSchema>

const defaultValues = {
  username: "",
  email: "",
  phone: "",
  password: "",
  role: "user" as const,
  status: 1,
}

// ── Shared form fields ──

function UserFormFields({
  form,
  passwordLabel,
  passwordPlaceholder,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  passwordLabel: string
  passwordPlaceholder: string
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>用户名</FormLabel>
            <FormControl>
              <Input placeholder="username" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>邮箱</FormLabel>
            <FormControl>
              <Input type="email" placeholder="user@example.com（与手机号至少填一项）" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>手机号</FormLabel>
            <FormControl>
              <Input type="tel" inputMode="numeric" placeholder="13800138000" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{passwordLabel}</FormLabel>
            <FormControl>
              <Input type="password" placeholder={passwordPlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>角色</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="agent">代理商</SelectItem>
                <SelectItem value="user">用户</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
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
                <SelectItem value="1">正常</SelectItem>
                <SelectItem value="0">禁用</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

// ── Create Dialog ──

export function UserCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<CreateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset(defaultValues)
    }
  }, [open, form])

  const onSubmit = async (values: CreateFormValues) => {
    setServerError("")
    try {
      const { data: res } = await postAdminUsers({ body: values })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames: Object.keys(defaultValues),
        })
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames: Object.keys(defaultValues) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>添加用户</DialogTitle>
          <DialogDescription>创建一个新用户</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <UserFormFields form={form} passwordLabel="密码" passwordPlaceholder="至少 6 位" />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Dialog ──

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserUserItem
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")

  const form = useForm<UpdateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateSchema) as any,
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError("")
      form.reset({
        username: user.username ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        password: "",
        role: (user.role as "admin" | "agent" | "user") ?? "user",
        status: user.status ?? 1,
      })
    }
  }, [open, user, form])

  const onSubmit = async (values: UpdateFormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminUsersById({
        path: { id: user.id! },
        body: {
          username: values.username,
          email: values.email,
          phone: values.phone,
          password: values.password || undefined,
          role: values.role,
          status: values.status,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames: Object.keys(defaultValues),
        })
        return
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames: Object.keys(defaultValues) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>修改用户信息</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <UserFormFields form={form} passwordLabel="密码（留空不修改）" passwordPlaceholder="留空不修改" />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

