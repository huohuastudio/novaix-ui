import { useMemo } from "react"
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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const user = getUser()
  const { site_name: siteName, site_logo: siteLogo } = useSiteSettings()
  const adminPath = useAdminPath()
  const navGroups = useMemo(() => buildNavGroups(adminPath), [adminPath])

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                  {siteLogo ? (
                    <img src={siteLogo} alt={siteName} className="size-full object-contain" />
                  ) : (
                    <NovaLogo className="size-5" withBackground={false} />
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
      <SidebarContent>
        <NavMain groups={navGroups} />
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
