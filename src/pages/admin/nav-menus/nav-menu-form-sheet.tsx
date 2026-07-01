import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { postAdminNavMenus, putAdminNavMenusById } from "@/api"
import type { NavmenuNavMenuItem } from "@/api"
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

const formSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(255, "标题不能超过 255 个字符"),
  url: z.string().min(1, "链接不能为空").max(2048, "链接不能超过 2048 个字符"),
  location: z.string().min(1, "请选择位置"),
  target: z.string(),
  icon: z.string().max(255, "图标不能超过 255 个字符").optional().or(z.literal("")),
  parent_id: z.coerce.number().int().nullable(),
  status: z.coerce.number().int(),
  sort_order: z.coerce.number().int().min(0, "排序权重不能为负数"),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  title: "",
  url: "",
  location: "",
  target: "_self",
  icon: "",
  parent_id: null,
  status: 1,
  sort_order: 0,
}

const fieldNames = Object.keys(defaultValues) as (keyof FormValues)[]

function NavMenuFormFields({
  form,
  menus,
  excludeId,
}: {
  form: ReturnType<typeof useForm<FormValues>>
  menus: NavmenuNavMenuItem[]
  excludeId?: number
}) {
  const currentLocation = form.watch("location")
  const prevLocationRef = useRef(currentLocation)

  useEffect(() => {
    if (prevLocationRef.current && prevLocationRef.current !== currentLocation) {
      form.setValue("parent_id", null)
    }
    prevLocationRef.current = currentLocation
  }, [currentLocation, form])

  const parentOptions = menus.filter(
    (m) => m.location === currentLocation && (!excludeId || m.id !== excludeId)
  )

  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>标题</FormLabel>
            <FormControl>
              <Input placeholder="输入菜单标题" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="url"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>链接</FormLabel>
            <FormControl>
              <Input placeholder="输入链接地址，如 /about 或 https://example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>位置</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择位置" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="header">顶部导航</SelectItem>
                  <SelectItem value="footer">底部导航</SelectItem>
                  <SelectItem value="sidebar">侧边栏</SelectItem>
                </SelectContent>
              </Select>
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
        name="icon"
        render={({ field }) => (
          <FormItem>
            <FormLabel>图标</FormLabel>
            <FormControl>
              <Input placeholder="图标类名或 URL（可选）" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="parent_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>父菜单</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(v === "0" ? null : Number(v))}
              value={field.value ? String(field.value) : "0"}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="0">无（顶级菜单）</SelectItem>
                {parentOptions.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.title}
                  </SelectItem>
                ))}
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

export function NavMenuCreateSheet({
  open,
  onOpenChange,
  onSuccess,
  menus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  menus: NavmenuNavMenuItem[]
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
      const { data: res } = await postAdminNavMenus({
        body: {
          title: values.title,
          url: values.url,
          location: values.location,
          target: values.target,
          icon: values.icon || undefined,
          parent_id: values.parent_id ?? undefined,
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
      title="新建菜单"
      description="创建一个新的导航菜单项"
      footer={
        <Button form="nav-menu-create-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "创建中..." : "创建"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="nav-menu-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <NavMenuFormFields form={form} menus={menus} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}

export function NavMenuEditSheet({
  open,
  onOpenChange,
  menu,
  onSuccess,
  menus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  menu: NavmenuNavMenuItem
  onSuccess: () => void
  menus: NavmenuNavMenuItem[]
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
        title: menu.title ?? "",
        url: menu.url ?? "",
        location: menu.location ?? "",
        target: menu.target ?? "_self",
        icon: menu.icon ?? "",
        parent_id: menu.parent_id ?? null,
        status: menu.status ?? 1,
        sort_order: menu.sort_order ?? 0,
      })
    }
  }, [open, menu, form])

  const onSubmit = async (values: FormValues) => {
    setServerError("")
    try {
      const { data: res } = await putAdminNavMenusById({
        path: { id: menu.id! },
        body: {
          title: values.title,
          url: values.url,
          location: values.location,
          target: values.target,
          icon: values.icon,
          parent_id: values.parent_id,
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
      title="编辑菜单"
      description="修改导航菜单项"
      footer={
        <Button form="nav-menu-edit-form" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "保存"}
        </Button>
      }
    >
      <Form {...form}>
        <form id="nav-menu-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <NavMenuFormFields form={form} menus={menus} excludeId={menu.id} />
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        </form>
      </Form>
    </FormSheet>
  )
}
