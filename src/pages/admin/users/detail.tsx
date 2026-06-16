import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  BarChart3,
  User,
  Server,
  ShoppingCart,
  ArrowLeftRight,
  CreditCard,
  MessageSquare,
  ScrollText,
  Pencil,
  Wallet,
  ArrowUpDown,
  LogIn,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  getAdminUsersByIdSummary,
  deleteAdminUsersById,
  postAdminUsersByIdLoginAs,
} from "@/api"
import type { UserUserSummaryResponse } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useAdminPath } from "@/hooks/use-site-settings"
import { useConfirm } from "@/hooks/use-confirm"
import { getErrorMessage } from "@/lib/utils"
import { UserEditDialog } from "./user-form-sheet"
import { RechargeDialog, AdjustBalanceDialog } from "./balance-dialog"
import { OverviewTab } from "./tabs/overview-tab"
import { ProfileTab } from "./tabs/profile-tab"
import { InstancesTab } from "./tabs/instances-tab"
import { OrdersTab } from "./tabs/orders-tab"
import { TransactionsTab } from "./tabs/transactions-tab"
import { TicketsTab } from "./tabs/tickets-tab"
import { PaymentsTab } from "./tabs/payments-tab"
import { LogsTab } from "./tabs/logs-tab"
import { roleMap } from "@/lib/user-constants"

const TABS = ["overview", "profile", "instances", "orders", "transactions", "payments", "tickets", "logs"] as const
type TabValue = (typeof TABS)[number]

const TAB_LABELS: Record<TabValue, string> = {
  overview: "概览",
  profile: "个人资料",
  instances: "实例",
  orders: "订单",
  transactions: "交易记录",
  payments: "支付记录",
  tickets: "工单",
  logs: "操作日志",
}

const TAB_ICONS: Record<TabValue, typeof BarChart3> = {
  overview: BarChart3,
  profile: User,
  instances: Server,
  orders: ShoppingCart,
  transactions: ArrowLeftRight,
  payments: CreditCard,
  tickets: MessageSquare,
  logs: ScrollText,
}

function resolveTab(pathname: string, id: string, adminPath: string): TabValue {
  const base = `${adminPath}/users/${id}`
  const sub = pathname.slice(base.length).replace(/^\//, "").split("/")[0]
  if (sub && TABS.includes(sub as TabValue)) return sub as TabValue
  return "overview"
}

function DetailSkeleton({ tab }: { tab: TabValue }) {
  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <Tabs value={tab} className="pointer-events-none">
        <div className="overflow-x-auto no-scrollbar">
          <TabsList variant="line">
            {TABS.map((t) => {
              const Icon = TAB_ICONS[t]
              return (
                <TabsTrigger key={t} value={t}>
                  <Icon className="size-4" />
                  {TAB_LABELS[t]}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      </Tabs>
      <div className="space-y-5">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-36 mt-1" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 max-w-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const adminPath = useAdminPath()
  const [summary, setSummary] = useState<UserUserSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const activeTab = id ? resolveTab(location.pathname, id, adminPath) : "overview"
  const visitedRef = useRef(new Set<TabValue>(["overview", activeTab]))

  const fetchSummary = useCallback(
    async (silent = false) => {
      if (!id) return
      if (!silent) setLoading(true)
      try {
        const { data: res } = await getAdminUsersByIdSummary({ path: { id: Number(id) } })
        if (res?.code === 0 && res.data) {
          setSummary(res.data as UserUserSummaryResponse)
        } else if (!silent) {
          navigate(`${adminPath}/users`, { replace: true })
        }
      } catch {
        if (!silent) navigate(`${adminPath}/users`, { replace: true })
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id, navigate, adminPath],
  )

  const refreshSummary = useCallback(() => fetchSummary(true), [fetchSummary])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
    fetchSummary(false)
  }, [fetchSummary])

  const user = summary?.user

  useBreadcrumb([
    { label: "用户管理", href: `${adminPath}/users` },
    { label: user?.username ?? "详情", href: `${adminPath}/users/${id}` },
    ...(activeTab !== "overview" ? [{ label: TAB_LABELS[activeTab] }] : []),
  ])

  const navigateToTab = useCallback(
    (tab: string) => {
      visitedRef.current.add(tab as TabValue)
      if (tab === "overview") {
        navigate(`${adminPath}/users/${id}`)
      } else {
        navigate(`${adminPath}/users/${id}/${tab}`)
      }
    },
    [id, navigate, adminPath],
  )

  const handleDelete = async () => {
    if (!user) return
    const ok = await confirm({
      title: "删除用户",
      description: `确定要删除用户「${user.username}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminUsersById({ path: { id: user.id! } })
      if (res?.code === 0) {
        toast.success("用户已删除")
        navigate(`${adminPath}/users`, { replace: true })
      } else {
        toast.error(res?.message || "删除失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }

  const handleLoginAs = async () => {
    if (!user) return
    try {
      const { data: res } = await postAdminUsersByIdLoginAs({ path: { id: user.id! } })
      if (res?.code === 0 && res.data?.ticket) {
        window.open(`/portal/impersonate?ticket=${res.data.ticket}`, "_blank")
      } else {
        toast.error(res?.message || "获取登录凭证失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "获取登录凭证失败"))
    }
  }

  const editUser = user
    ? { id: user.id, username: user.username, email: user.email, phone: user.phone, role: user.role, status: user.status, balance: user.balance }
    : null

  if (loading) return <DetailSkeleton tab={activeTab} />
  if (!user) return null

  const role = roleMap[user.role ?? ""] ?? { label: user.role, variant: "outline" as const }
  const canLoginAs = user.role !== "admin" && user.status === 1

  return (
    <>
      <div className="px-6 pt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{user.username}</h1>
              <Badge variant={role.variant}>{role.label}</Badge>
              <Badge variant={user.status === 1 ? "default" : "secondary"}>
                {user.status === 1 ? "正常" : "禁用"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[user.email, user.phone].filter(Boolean).join(" · ") || "未设置联系方式"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canLoginAs && (
              <Button variant="outline" onClick={handleLoginAs}>
                <LogIn className="size-4" />
                登录
              </Button>
            )}
            <Button variant="outline" onClick={() => setRechargeOpen(true)}>
              <Wallet className="size-4" />
              充值
            </Button>
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              <ArrowUpDown className="size-4" />
              调账
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              编辑
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="size-4" />
              删除
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={navigateToTab} className="overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <TabsList variant="line">
              {TABS.map((t) => {
                const Icon = TAB_ICONS[t]
                return (
                  <TabsTrigger key={t} value={t}>
                    <Icon className="size-4" />
                    {TAB_LABELS[t]}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </Tabs>

        {/* Tab Content */}
        <div>
          <div className={activeTab !== "overview" ? "hidden" : undefined}>
            <OverviewTab summary={summary!} onTabChange={navigateToTab} />
          </div>

          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("profile") && (
            <div className={activeTab !== "profile" ? "hidden" : undefined}>
              <ProfileTab user={user} summary={summary!} onSuccess={refreshSummary} />
            </div>
          )}

          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("instances") && (
            <div className={activeTab !== "instances" ? "hidden" : undefined}>
              <InstancesTab userId={user.id!} />
            </div>
          )}

          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("orders") && (
            <div className={activeTab !== "orders" ? "hidden" : undefined}>
              <OrdersTab userId={user.id!} />
            </div>
          )}

          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("transactions") && (
            <div className={activeTab !== "transactions" ? "hidden" : undefined}>
              <TransactionsTab userId={user.id!} />
            </div>
          )}

          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("payments") && (
            <div className={activeTab !== "payments" ? "hidden" : undefined}>
              <PaymentsTab userId={user.id!} />
            </div>
          )}

          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("tickets") && (
            <div className={activeTab !== "tickets" ? "hidden" : undefined}>
              <TicketsTab userId={user.id!} />
            </div>
          )}

          {/* eslint-disable-next-line react-hooks/refs */}
          {visitedRef.current.has("logs") && (
            <div className={activeTab !== "logs" ? "hidden" : undefined}>
              <LogsTab userId={user.id!} />
            </div>
          )}
        </div>
      </div>

      {editUser && (
        <UserEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={editUser}
          onSuccess={refreshSummary}
        />
      )}
      <RechargeDialog
        open={rechargeOpen}
        onOpenChange={setRechargeOpen}
        user={editUser}
        onSuccess={refreshSummary}
      />
      <AdjustBalanceDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        user={editUser}
        onSuccess={refreshSummary}
      />
      {ConfirmDialog}
    </>
  )
}
