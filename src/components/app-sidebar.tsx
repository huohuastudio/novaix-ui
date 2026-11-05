import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getUser } from "@/lib/auth"
import { buildNavGroups } from "@/lib/nav"
import { useSiteSettings, useAdminPath } from "@/hooks/use-site-settings"
import { NovaLogo } from "@/components/nova-logo"
import { getAdminSupplierOperationsAttentionOptions } from "@/api/@tanstack/react-query.gen"

const ATTENTION_REFRESH_INTERVAL = 60_000

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const user = getUser()
  const {
    site_name: siteName,
    site_logo: siteLogo,
    self_hosted_enabled: selfHostedEnabled,
    supplier_resale_enabled: supplierResaleEnabled,
  } = useSiteSettings()
  const adminPath = useAdminPath()
  // 经营模式开关为 "false" 的分组或菜单项隐藏（featureKey 只加锁不隐藏）
  const navGroups = useMemo(() => {
    const switches: Record<string, string> = {
      self_hosted_enabled: selfHostedEnabled,
      supplier_resale_enabled: supplierResaleEnabled,
    }
    const visible = (key?: string) => !key || switches[key] !== "false"
    return buildNavGroups(adminPath)
      .filter((g) => visible(g.settingKey))
      .map((g) => ({ ...g, items: g.items.filter((item) => visible(item.settingKey)) }))
      .filter((g) => g.items.length > 0)
  }, [adminPath, selfHostedEnabled, supplierResaleEnabled])

  // 供应商待处理数量角标：转售开启时轮询（不受授权限制，授权失效后仍需处理存量服务）
  const attentionQuery = useQuery({
    ...getAdminSupplierOperationsAttentionOptions(),
    enabled: supplierResaleEnabled !== "false",
    refetchInterval: ATTENTION_REFRESH_INTERVAL,
  })
  const attentionCount = attentionQuery.data?.data?.count ?? 0
  const badges = useMemo(() => ({ supplier_attention: attentionCount }), [attentionCount])

  return (
    <Sidebar variant="inset" collapsible="icon" data-tour="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className={`flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden ${siteLogo ? "" : "dark:bg-transparent"}`}>
                  {siteLogo ? (
                    <img src={siteLogo} alt={siteName} className="size-full object-contain" />
                  ) : (
                    <>
                      {/* 暗色主题下主色为蓝色，蓝色 Logo 会融进背景，改用自带浅色底的版本 */}
                      <NovaLogo className="size-5 dark:hidden" withBackground={false} />
                      <NovaLogo className="hidden size-8 dark:block" />
                    </>
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{siteName}</span>
                  <span className="truncate text-xs">管理后台</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain groups={navGroups} badges={badges} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.username ?? "",
            email: user?.email ?? "",
            avatar: "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
