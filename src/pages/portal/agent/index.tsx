import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { Users, Coins, TrendingUp, Copy, Check, Link2 } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SimplePagination } from "@/components/simple-pagination"
import { useSiteName, useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { useCopyToClipboard } from "@uidotdev/usehooks"
import {
  getPortalAgentStatsOptions,
  getPortalAgentLinkOptions,
  getPortalAgentUsersOptions,
  getPortalAgentCommissionsOptions,
} from "@/api/@tanstack/react-query.gen"
import type { PortalAgentStatsResponse } from "@/api"

export default function PortalAgent() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  useDocumentTitle(`代理中心 - ${siteName}`)

  const [, copyToClipboard] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  const [usersPage, setUsersPage] = useState(1)
  const [commissionsPage, setCommissionsPage] = useState(1)

  const pageSize = 10

  // 统计和推荐链接
  const statsQuery = useQuery(getPortalAgentStatsOptions())
  const linkQuery = useQuery(getPortalAgentLinkOptions())
  const statsLoading = statsQuery.isPending || linkQuery.isPending
  const stats = statsQuery.data?.code === 0
    ? (statsQuery.data.data as PortalAgentStatsResponse)
    : null
  const link = linkQuery.data?.code === 0
    ? ((linkQuery.data.data as { link?: string })?.link ?? "")
    : ""

  // 下级用户
  const usersQuery = useQuery({
    ...getPortalAgentUsersOptions({ query: { page: usersPage, page_size: pageSize } }),
    placeholderData: keepPreviousData,
  })
  const usersLoading = usersQuery.isPending
  const users = usersQuery.data?.data?.items ?? []
  const usersTotal = usersQuery.data?.data?.total ?? 0

  // 返佣记录
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">代理中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看推荐数据和返佣记录</p>
      </div>

      {/* 统计卡片 */}
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

      {/* 推荐链接 */}
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

      {/* 下级用户列表 */}
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

      {/* 返佣记录 */}
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
    </div>
  )
}
