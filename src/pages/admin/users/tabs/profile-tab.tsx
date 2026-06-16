import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  putAdminUsersById,
  putAdminUsersByIdKycReset,
  getAdminUsers,
  getAdminAgentGroups,
} from "@/api"
import type { UserUserDetailItem, UserUserSummaryResponse } from "@/api"
import { handleCatchError, handleServerErrors } from "@/lib/form-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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
  PaginatedSelect,
  type PaginatedSelectItem,
} from "@/components/paginated-select"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { getErrorMessage } from "@/lib/utils"

const schema = z.object({
  username: z.string().min(2, "用户名至少 2 个字符").max(64),
  email: z.union([z.literal(""), z.string().email("请输入有效的邮箱地址").max(255)]),
  phone: z.string().max(20).regex(/^\d*$/, "手机号只能是数字"),
  password: z.string().max(72).optional().default(""),
  role: z.enum(["admin", "agent", "user"]),
  status: z.coerce.number().int(),
  parent_id: z.string(),
  commission_rate: z.coerce.number().int().min(0).max(100),
  commission_rate_recurring: z.coerce.number().int().min(0).max(100),
  agent_group_id: z.string(),
})

type FormValues = z.infer<typeof schema>

export function ProfileTab({
  user,
  summary,
  onSuccess,
}: {
  user: UserUserDetailItem
  summary: UserUserSummaryResponse
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState("")
  const [resettingKyc, setResettingKyc] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  const formatDate = useFormatDate()

  const parentInitialItem: PaginatedSelectItem | undefined = user.parent_id
    ? { id: String(user.parent_id), label: summary.parent_username || `用户 #${user.parent_id}` }
    : undefined

  const agentGroupInitialItem: PaginatedSelectItem | undefined = user.agent_group_id
    ? { id: String(user.agent_group_id), label: summary.agent_group_name || `分组 #${user.agent_group_id}` }
    : undefined

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      username: user.username ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      password: "",
      role: (user.role as "admin" | "agent" | "user") ?? "user",
      status: user.status ?? 1,
      parent_id: user.parent_id ? String(user.parent_id) : "",
      commission_rate: user.commission_rate ?? 0,
      commission_rate_recurring: user.commission_rate_recurring ?? 0,
      agent_group_id: user.agent_group_id ? String(user.agent_group_id) : "",
    },
  })

  useEffect(() => {
    form.reset({
      username: user.username ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      password: "",
      role: (user.role as "admin" | "agent" | "user") ?? "user",
      status: user.status ?? 1,
      parent_id: user.parent_id ? String(user.parent_id) : "",
      commission_rate: user.commission_rate ?? 0,
      commission_rate_recurring: user.commission_rate_recurring ?? 0,
      agent_group_id: user.agent_group_id ? String(user.agent_group_id) : "",
    })
  }, [user, form])

  const fetchUsers = useCallback(async (page: number, keyword: string) => {
    const { data: res } = await getAdminUsers({
      query: { page, page_size: 20, keyword: keyword || undefined, role: "agent" },
    })
    const items: PaginatedSelectItem[] = (res?.data?.items ?? []).map((u) => ({
      id: String(u.id),
      label: u.username ?? `#${u.id}`,
      description: u.email || u.phone || undefined,
    }))
    return {
      items,
      hasMore: items.length >= 20,
    }
  }, [])

  const fetchAgentGroups = useCallback(async () => {
    const { data: res } = await getAdminAgentGroups()
    const items: PaginatedSelectItem[] = (res?.data ?? []).map((g) => ({
      id: String(g.id),
      label: g.name ?? `#${g.id}`,
      description: g.description || undefined,
    }))
    return { items, hasMore: false }
  }, [])

  const onSubmit = async (values: FormValues) => {
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
          parent_id: values.parent_id ? Number(values.parent_id) : 0,
          commission_rate: values.commission_rate,
          commission_rate_recurring: values.commission_rate_recurring,
          agent_group_id: values.agent_group_id ? Number(values.agent_group_id) : 0,
        },
      })
      if (res?.code !== 0) {
        handleServerErrors(res, {
          setError: form.setError,
          setServerError,
          fieldNames: ["username", "email", "phone", "password", "role", "status"],
        })
        return
      }
      toast.success("用户信息已更新")
      onSuccess()
    } catch (err) {
      handleCatchError(err, "请求失败，请重试", { setError: form.setError, setServerError, fieldNames: ["username", "email", "phone", "password", "role", "status"] })
    }
  }

  const handleResetKyc = async () => {
    const ok = await confirm({
      title: "重置实名认证",
      description: "确定要重置该用户的实名认证状态吗？用户需要重新进行实名认证。",
      confirmText: "重置",
      destructive: true,
    })
    if (!ok) return
    setResettingKyc(true)
    try {
      const { data: res } = await putAdminUsersByIdKycReset({ path: { id: user.id! } })
      if (res?.code === 0) {
        toast.success("实名认证已重置")
        onSuccess()
      } else {
        toast.error(res?.message || "重置失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setResettingKyc(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          {/* 账户信息 */}
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">账户信息</h3>
              <p className="text-sm text-muted-foreground mt-1">用户的基本账户设置</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>用户名</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input type="email" placeholder="user@example.com" {...field} />
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
                    <FormLabel>密码（留空不修改）</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="留空不修改" {...field} />
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
            </div>
          </section>

          <Separator className="my-8" />

          {/* 代理设置 */}
          <section className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold">代理设置</h3>
              <p className="text-sm text-muted-foreground mt-1">代理关系和佣金配置</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>上级用户</FormLabel>
                    <PaginatedSelect
                      value={field.value}
                      onChange={field.onChange}
                      fetchFn={fetchUsers}
                      initialItem={parentInitialItem}
                      placeholder="选择上级用户（仅代理商）"
                      searchPlaceholder="搜索用户名..."
                      emptyText="未找到代理商用户"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agent_group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>代理分组</FormLabel>
                    <PaginatedSelect
                      value={field.value}
                      onChange={field.onChange}
                      fetchFn={fetchAgentGroups}
                      initialItem={agentGroupInitialItem}
                      placeholder="选择代理分组"
                      searchPlaceholder="搜索分组名称..."
                      emptyText="未找到代理分组"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commission_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>首单返佣比例 (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commission_rate_recurring"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>续费返佣比例 (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <Separator className="my-8" />

          {/* 实名信息（只读） */}
          <section className="space-y-5">
            <div className="flex items-center justify-between max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold">实名认证</h3>
                <p className="text-sm text-muted-foreground mt-1">认证信息为只读，可重置后让用户重新认证</p>
              </div>
              {user.kyc_status === "verified" && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleResetKyc}
                  disabled={resettingKyc}
                >
                  {resettingKyc && <Spinner />}
                  重置认证
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm max-w-2xl">
              <div>
                <div className="text-muted-foreground">认证状态</div>
                <div className="mt-1">
                  <Badge variant={user.kyc_status === "verified" ? "default" : "outline"}>
                    {user.kyc_status === "verified" ? "已认证" : "未认证"}
                  </Badge>
                </div>
              </div>
              {user.kyc_status === "verified" && (
                <>
                  <div>
                    <div className="text-muted-foreground">真实姓名</div>
                    <div className="font-medium mt-0.5">{user.kyc_real_name || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">证件号码</div>
                    <div className="font-medium font-mono mt-0.5">{user.kyc_id_number || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">认证渠道</div>
                    <div className="font-medium mt-0.5">{user.kyc_provider || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">认证时间</div>
                    <div className="font-medium mt-0.5">{formatDate(user.kyc_verified_at)}</div>
                  </div>
                </>
              )}
            </div>
          </section>

          <Separator className="my-8" />

          {serverError && <p className="text-sm text-destructive mb-4">{serverError}</p>}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "保存中..." : "保存更改"}
          </Button>
        </form>
      </Form>
      {ConfirmDialog}
    </>
  )
}
