import { useState, useEffect } from "react"
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query"
import { Users, Coins, TrendingUp, Copy, Check, Link2, UserPlus, Clock, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SimplePagination } from "@/components/simple-pagination"
import { useSiteName, useSiteSettings, useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { getUser, setUser, isImpersonating } from "@/lib/auth"
import {
  getPortalAgentStatsOptions,
  getPortalAgentLinkOptions,
  getPortalAgentUsersOptions,
  getPortalAgentCommissionsOptions,
  getPortalAgentApplicationOptions,
} from "@/api/@tanstack/react-query.gen"
import { postPortalAgentApply } from "@/api"
import type { PortalAgentStatsResponse, PortalMyApplicationResponse } from "@/api"
import { getErrorMessage } from "@/lib/utils"

function AgentApplySection({ applicationOpen }: { applicationOpen: boolean }) {
  const [remark, setRemark] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const appQuery = useQuery(getPortalAgentApplicationOptions())
  const appLoading = appQuery.isPending
  const app = (appQuery.data?.code === 0 ? appQuery.data.data : null) as PortalMyApplicationResponse | null
  const appStatus = app?.status

  const handleApply = async () => {
    setSubmitting(true)
    try {
      const { data: res } = await postPortalAgentApply({ body: { remark } })
      if (res?.code === 0) {
        const status = (res.data as { status?: string })?.status
        if (status === "approved") {
          toast.success("申请已自动通过，您已成为代理")
          // 同步本地角色并刷新（导航等组件需要 reload 才能更新）
          const user = getUser()
          if (user) {
            const updated = { ...user, role: "agent" }
            if (isImpersonating()) {
              sessionStorage.setItem("user", JSON.stringify(updated))
            } else {
              setUser(updated)
            }
          }
          window.location.reload()
          return
        } else {
          toast.success("申请已提交，请等待审核")
        }
        queryClient.invalidateQueries({ queryKey: getPortalAgentApplicationOptions().queryKey })
      } else {
        toast.error(res?.message ?? "申请失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "申请失败"))
    } finally {
      setSubmitting(false)
    }
  }

  if (appLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full max-w-lg" />
      </div>
    )
  }

  if (appStatus === "pending") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="rounded-full bg-amber-500/10 p-4">
          <Clock className="size-8 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">申请审核中</h2>
          <p className="text-sm text-muted-foreground mt-1">您的代理申请已提交，管理员将尽快审核</p>
        </div>
        {app?.remark && (
          <p className="text-sm text-muted-foreground max-w-md">
            您的备注：{app?.remark}
          </p>
        )}
      </div>
    )
  }

  // approved 且后端确认仍是代理 → 父级 useEffect 会同步角色后切换到代理面板
  if (appStatus === "approved") {
    const isStillAgent = app?.is_agent
    if (isStillAgent) return null
    // 已被取消代理 → 落入下面的默认分支展示申请表单
  }

  if (appStatus === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <XCircle className="size-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">申请未通过</h2>
          {app?.reject_reason && (
            <p className="text-sm text-muted-foreground mt-1">
              原因：{app?.reject_reason}
            </p>
          )}
        </div>
        {applicationOpen && (
          <div className="w-full max-w-md space-y-3">
            <div className="space-y-2">
              <Label>备注（选填）</Label>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="说明您的推广渠道或合作意向..."
                maxLength={500}
                rows={3}
              />
            </div>
            <Button onClick={handleApply} disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="size-4 animate-spin" />提交中...</> : "重新申请"}
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (!applicationOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="rounded-full bg-muted p-4">
          <UserPlus className="size-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">代理申请暂未开放</h2>
          <p className="text-sm text-muted-foreground mt-1">请稍后再试</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
      <div className="rounded-full bg-primary/10 p-4">
        <UserPlus className="size-8 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">成为推广代理</h2>
        <p className="text-sm text-muted-foreground mt-1">申请成为代理，分享推荐链接即可获得返佣收入</p>
      </div>
      <div className="w-full max-w-md space-y-3">
        <div className="space-y-2">
          <Label>备注（选填）</Label>
          <Textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="说明您的推广渠道或合作意向..."
            maxLength={500}
            rows={3}
          />
        </div>
        <Button onClick={handleApply} disabled={submitting} className="w-full">
          {submitting ? <><Loader2 className="size-4 animate-spin" />提交中...</> : "申请成为代理"}
        </Button>
      </div>
    </div>
  )
}

function AgentDashboard() {
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()

  const [, copyToClipboard] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  const [usersPage, setUsersPage] = useState(1)
  const [commissionsPage, setCommissionsPage] = useState(1)

  const pageSize = 10

  const statsQuery = useQuery(getPortalAgentStatsOptions())
  const linkQuery = useQuery(getPortalAgentLinkOptions())
  const statsLoading = statsQuery.isPending || linkQuery.isPending
  const stats = statsQuery.data?.code === 0
    ? (statsQuery.data.data as PortalAgentStatsResponse)
    : null
  const linkPath = linkQuery.data?.code === 0
    ? ((linkQuery.data.data as { link?: string })?.link ?? "")
    : ""
  const link = linkPath ? `${window.location.origin}${linkPath}` : ""

  const usersQuery = useQuery({
    ...getPortalAgentUsersOptions({ query: { page: usersPage, page_size: pageSize } }),
    placeholderData: keepPreviousData,
  })
  const usersLoading = usersQuery.isPending
  const users = usersQuery.data?.data?.items ?? []
  const usersTotal = usersQuery.data?.data?.total ?? 0

  const commissionsQuery = useQuery({
    ...getPortalAgentCommissionsOptions({ query: { page: commissionsPage, page_size: pageSize } }),
    placeholderData: keepPreviousData,
  })
  const commissionsLoading = commissionsQuery.isPending
  const commissions = commissionsQuery.data?.data?.items ?? []
  const commissionsTotal = commissionsQuery.data?.data?.total ?? 0

  const handleCopy = () => {
    copyToClipboard(link)
    setCopied(true)
    toast.success("已复制到剪贴板")
    setTimeout(() => setCopied(false), 2000)
  }

  const statCards = [
    { label: "下级用户", value: stats?.sub_user_count ?? 0, icon: Users, format: (v: number) => String(v) },
    { label: "累计返佣", value: stats?.total_commission ?? 0, icon: Coins, format: (v: number) => formatAmount(v) },
    { label: "本月返佣", value: stats?.month_commission ?? 0, icon: TrendingUp, format: (v: number) => formatAmount(v) },
  ]

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-background p-5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-28 mt-2" />
              </div>
            ))
          : statCards.map((card) => (
              <div key={card.label} className="rounded-2xl bg-background p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <card.icon className="size-4" />
                  {card.label}
                </div>
                <p className="text-2xl font-semibold tracking-tight mt-1">
                  {card.format(card.value)}
                </p>
              </div>
            ))
        }
      </div>

      <div className="rounded-2xl bg-background p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="size-4" />
          推荐链接
        </div>
        {statsLoading ? (
          <Skeleton className="h-9 w-full max-w-lg" />
        ) : (
          <div className="flex items-center gap-2 max-w-lg">
            <Input value={link} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">分享此链接，通过链接注册的用户将成为您的下级用户</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">下级用户</h2>
        {usersLoading ? (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 flex justify-between">
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48 mt-1" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">暂无下级用户</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-background divide-y divide-border/50">
              {users.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
                </div>
              ))}
            </div>
            {usersTotal > pageSize && (
              <SimplePagination
                page={usersPage}
                pageSize={pageSize}
                total={usersTotal}
                onChange={setUsersPage}
              />
            )}
          </>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">返佣记录</h2>
        {commissionsLoading ? (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 flex justify-between">
                <div>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : commissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Coins className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">暂无返佣记录</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-background divide-y divide-border/50">
              {commissions.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      订单 <span className="font-mono">{item.order_no}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      返佣比例 {item.rate}% &middot; {formatDate(item.created_at)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    +{formatAmount(item.amount ?? 0)}
                  </span>
                </div>
              ))}
            </div>
            {commissionsTotal > pageSize && (
              <SimplePagination
                page={commissionsPage}
                pageSize={pageSize}
                total={commissionsTotal}
                onChange={setCommissionsPage}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}

export default function PortalAgent() {
  const siteName = useSiteName()
  useDocumentTitle(`代理中心 - ${siteName}`)
  const { agent_enabled, agent_application_enabled } = useSiteSettings()
  const applicationOpen = agent_enabled === "true" && agent_application_enabled === "true"

  // 用服务端 is_agent 决定分支，避免本地角色缓存过期
  const appQuery = useQuery(getPortalAgentApplicationOptions())
  const serverIsAgent = appQuery.data?.code === 0
    ? (appQuery.data.data as PortalMyApplicationResponse | null)?.is_agent
    : undefined
  // 加载中用本地角色作占位，加载完用服务端结果
  const localIsAgent = getUser()?.role === "agent"
  const isAgent = serverIsAgent ?? localIsAgent

  // 服务端角色和本地不一致时同步本地缓存
  useEffect(() => {
    if (serverIsAgent === undefined) return
    const user = getUser()
    if (!user || (user.role === "agent") === serverIsAgent) return
    const updated = { ...user, role: serverIsAgent ? "agent" : "user" }
    if (isImpersonating()) {
      sessionStorage.setItem("user", JSON.stringify(updated))
    } else {
      setUser(updated as typeof user)
    }
  }, [serverIsAgent])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">代理中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAgent ? "查看推荐数据和返佣记录" : "申请成为推广代理"}
        </p>
      </div>
      {isAgent ? <AgentDashboard /> : <AgentApplySection applicationOpen={applicationOpen} />}
    </div>
  )
}
