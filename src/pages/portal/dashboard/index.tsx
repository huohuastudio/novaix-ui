import { useEffect, useState } from 'react'
import {
  Server,
  ShoppingCart,
  Ticket,
  Wallet,
  ArrowRight,
  Plus,
  Megaphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSiteName, useFormatAmount } from '@/hooks/use-site-settings'
import { getUser } from '@/lib/auth'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { getPortalDashboardStats, getPortalAnnouncements } from '@/api'
import type { PortalDashboardStatsResponse, PortalPortalAnnouncementItem } from '@/api'

const services = [
  {
    title: '云服务器',
    description: '高性能弹性计算服务，按需选配 CPU、内存和存储',
    icon: Server,
    to: '/portal/servers',
    action: '立即选购',
  },
  {
    title: '费用中心',
    description: '查看账单、充值余额、管理订单与续费',
    icon: Wallet,
    to: '/portal/wallet',
    action: '进入管理',
  },
  {
    title: '工单支持',
    description: '遇到问题？提交工单获取技术支持',
    icon: Ticket,
    to: '/portal/tickets',
    action: '提交工单',
  },
]

export default function PortalDashboard() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const user = getUser()
  useDocumentTitle(`控制台 - ${siteName}`)

  const [stats, setStats] = useState<PortalDashboardStatsResponse | null>(null)
  const [announcements, setAnnouncements] = useState<PortalPortalAnnouncementItem[]>([])
  useEffect(() => {
    Promise.all([
      getPortalDashboardStats(),
      getPortalAnnouncements({ query: { page_size: 5 } }),
    ]).then(([statsRes, announcementsRes]) => {
      setStats(statsRes.data?.data ?? null)
      setAnnouncements(announcementsRes.data?.data?.items ?? [])
    })
  }, [])

  const statItems = [
    { label: '云服务器', value: String(stats?.instances ?? 0), unit: '台', icon: Server, to: '/portal/servers', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
    { label: '待处理订单', value: String(stats?.pending_orders ?? 0), unit: '笔', icon: ShoppingCart, to: '/portal/orders', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
    { label: '工单', value: String(stats?.open_tickets ?? 0), unit: '个', icon: Ticket, to: '/portal/tickets', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { label: '账户余额', value: formatAmount(stats?.balance ?? 0), unit: '', icon: Wallet, to: '/portal/wallet', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/50' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-background px-6 py-8 sm:px-8 sm:py-10">
        <h1 className="text-xl sm:text-2xl font-semibold">
          你好，{user?.username || '用户'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          欢迎使用 {siteName} 云服务平台，在这里管理您的所有云资源。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/portal/purchase">
              <Plus className="size-4" />
              创建云服务器
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/portal/wallet">
              <Wallet className="size-4" />
              充值
            </Link>
          </Button>
        </div>
      </div>

      {/* 资源概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statItems.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="group rounded-2xl bg-background p-4 sm:p-5 transition-colors hover:bg-foreground/[.05]"
          >
            <div className="flex items-center justify-between">
              <div className={`flex size-9 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`size-[18px] ${stat.color}`} />
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-semibold tracking-tight">{stat.value}</span>
              {stat.unit && <span className="text-sm text-muted-foreground ml-1">{stat.unit}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* 产品与服务 + 公告 */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">产品与服务</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {services.map((svc) => (
              <Link
                key={svc.to}
                to={svc.to}
                className="group flex gap-4 rounded-2xl bg-background p-5 transition-colors hover:bg-foreground/[.05]"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <svc.icon className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{svc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{svc.description}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-primary mt-2 font-medium">
                    {svc.action}
                    <ArrowRight className="size-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 公告栏 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">最新公告</h2>
            <Link to="/portal/announcements" className="text-xs text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <div className="rounded-2xl bg-background">
            {announcements.length > 0 ? (
              <div className="divide-y divide-border/50">
                {announcements.map((item) => (
                  <Link
                    key={item.id}
                    to={`/portal/announcements`}
                    className="block px-5 py-3 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <p className="text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.created_at}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Megaphone className="size-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">暂无公告</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
