import { lazy } from "react"
import { Routes, Route, Link, useParams, Navigate } from "react-router-dom"
import {
  Megaphone,
  FileText,
  File,
  CircleHelp,
  HelpCircle,
  Navigation,
  Image,
  Handshake,
  MessageSquareQuote,
  MapPin,
  Link as LinkIcon,
  History,
  UsersRound,
  Gem,
} from "lucide-react"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useAdminPath } from "@/hooks/use-site-settings"
import { useIsPaid } from "@/hooks/use-edition"
import { HelpLink } from "@/components/help-doc"

const Announcements = lazy(() => import("@/pages/admin/announcements"))
const Articles = lazy(() => import("@/pages/admin/articles"))
const Pages = lazy(() => import("@/pages/admin/pages"))
const HelpCenter = lazy(() => import("@/pages/admin/help"))
const Faqs = lazy(() => import("@/pages/admin/faqs"))
const NavMenus = lazy(() => import("@/pages/admin/nav-menus"))
const Banners = lazy(() => import("@/pages/admin/banners"))
const Partners = lazy(() => import("@/pages/admin/partners"))
const Testimonials = lazy(() => import("@/pages/admin/testimonials"))
const DataCenters = lazy(() => import("@/pages/admin/data-centers"))
const Links = lazy(() => import("@/pages/admin/links"))
const Changelogs = lazy(() => import("@/pages/admin/changelogs"))
const TeamMembers = lazy(() => import("@/pages/admin/team-members"))
const BrandAssets = lazy(() => import("@/pages/admin/brand-assets"))

interface CMSItem {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
  featureKey?: string
}

interface CMSGroup {
  label: string
  items: CMSItem[]
}

const cmsGroups: CMSGroup[] = [
  {
    label: "文章与页面",
    items: [
      { id: "announcements", label: "公告管理", description: "发布和管理站点公告", icon: Megaphone, component: Announcements },
      { id: "articles", label: "文章管理", description: "新闻、资讯、活动等文章及分类", icon: FileText, component: Articles },
      { id: "pages", label: "单页面", description: "关于我们、服务条款等静态页面", icon: File, component: Pages },
    ],
  },
  {
    label: "客户支持",
    items: [
      { id: "help", label: "帮助中心", description: "帮助文档分类与文章", icon: CircleHelp, component: HelpCenter },
      { id: "faqs", label: "常见问题", description: "FAQ 常见问题列表", icon: HelpCircle, component: Faqs },
    ],
  },
  {
    label: "营销素材",
    items: [
      { id: "banners", label: "轮播图", description: "首页及各位置的轮播横幅", icon: Image, component: Banners },
      { id: "partners", label: "合作伙伴", description: "合作伙伴 Logo 与信息", icon: Handshake, component: Partners },
      { id: "testimonials", label: "客户评价", description: "客户推荐与评价展示", icon: MessageSquareQuote, component: Testimonials },
      { id: "data-centers", label: "数据中心", description: "数据中心信息与测试 IP", icon: MapPin, component: DataCenters },
      { id: "links", label: "友情链接", description: "友情链接和外部链接", icon: LinkIcon, component: Links },
    ],
  },
  {
    label: "站点配置",
    items: [
      { id: "nav-menus", label: "导航菜单", description: "网站导航菜单结构", icon: Navigation, component: NavMenus },
      { id: "changelogs", label: "更新日志", description: "产品更新日志", icon: History, component: Changelogs },
      { id: "team-members", label: "团队成员", description: "团队成员展示信息", icon: UsersRound, component: TeamMembers, featureKey: "team_members" },
      { id: "brand-assets", label: "品牌素材", description: "品牌 Logo 与素材文件", icon: Gem, component: BrandAssets, featureKey: "brand_customize" },
    ],
  },
]

const allItems = cmsGroups.flatMap((g) => g.items)

function CMSIndex() {
  useBreadcrumb([{ label: "内容管理" }])
  const isPaid = useIsPaid()

  const filteredGroups = cmsGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => !item.featureKey || isPaid) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">内容管理</h1>
        <HelpLink path="/novaix/cms" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">管理站点内容，供第三方主题动态渲染</p>

      <div className="mt-8 space-y-10">
        {filteredGroups.map((group) => (
          <section key={group.label}>
            <h3 className="text-base font-semibold mb-4">{group.label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.id}
                    to={item.id}
                    className="group flex items-start gap-3 rounded-lg p-3 -m-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-primary group-hover:underline">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function CMSDetail() {
  const { module } = useParams<{ module: string }>()
  const adminPath = useAdminPath()
  const isPaid = useIsPaid()
  const item = allItems.find((i) => i.id === module)

  useBreadcrumb(
    item
      ? [{ label: "内容管理", href: `${adminPath}/cms` }, { label: item.label }]
      : [{ label: "内容管理" }],
  )

  if (!item || (item.featureKey && !isPaid)) return <Navigate to={`${adminPath}/cms`} replace />

  const Component = item.component

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <div className="mb-6">
        <Link
          to={`${adminPath}/cms`}
          className="text-sm text-primary hover:underline"
        >
          内容管理
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{item.label}</h1>
          <HelpLink path="/novaix/cms" />
        </div>
      </div>
      <Component />
    </div>
  )
}

export default function CMS() {
  return (
    <Routes>
      <Route index element={<CMSIndex />} />
      <Route path=":module" element={<CMSDetail />} />
    </Routes>
  )
}
