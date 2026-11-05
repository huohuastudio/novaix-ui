import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ChevronRight, Lock } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useFeatureAllowed } from "@/hooks/use-edition"
import { ActivationDialog } from "@/components/activation-dialog"
import type { LucideIcon } from "lucide-react"

export type NavGroup = {
  label?: string
  defaultOpen?: boolean
  /** 站点设置开关键：对应值为 "false" 时整个分组隐藏（与 featureKey 加锁不同） */
  settingKey?: "self_hosted_enabled" | "supplier_resale_enabled"
  items: {
    title: string
    url: string
    icon: LucideIcon
    exact?: boolean
    featureKey?: string
    /** 角标数据键，数值由 NavMain 的 badges 传入，大于 0 时显示 */
    badgeKey?: string
    /** 站点设置开关键：对应值为 "false" 时隐藏该菜单项 */
    settingKey?: "self_hosted_enabled" | "supplier_resale_enabled"
  }[]
}

function NavItemButton({
  item,
  isActive,
  badge,
}: {
  item: NavGroup["items"][number]
  isActive: boolean
  badge?: number
}) {
  const navigate = useNavigate()
  const { isMobile, setOpenMobile } = useSidebar()
  const featureAllowed = useFeatureAllowed(item.featureKey ?? "")
  const allowed = item.featureKey ? featureAllowed : true
  const [showActivation, setShowActivation] = useState(false)

  return (
    <>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isActive}
        onClick={() => {
          if (allowed) {
            navigate(item.url)
            if (isMobile) setOpenMobile(false)
          } else {
            setShowActivation(true)
          }
        }}
      >
        <item.icon />
        <span className="flex-1">{item.title}</span>
        {!allowed && <Lock className="size-3 text-muted-foreground/50" />}
      </SidebarMenuButton>
      {allowed && !!badge && badge > 0 && (
        <SidebarMenuBadge className="bg-destructive/10 text-destructive">{badge > 99 ? "99+" : badge}</SidebarMenuBadge>
      )}
      {showActivation && (
        <ActivationDialog open={showActivation} onOpenChange={setShowActivation} />
      )}
    </>
  )
}

function isItemActive(item: NavGroup["items"][number], pathname: string) {
  return item.exact
    ? pathname === item.url
    : pathname === item.url || pathname.startsWith(item.url + "/")
}

function CollapsibleNavGroup({
  group,
  pathname,
  badges,
}: {
  group: NavGroup
  pathname: string
  badges?: Record<string, number>
}) {
  const hasActiveItem = group.items.some((item) =>
    isItemActive(item, pathname),
  )
  const [userToggled, setUserToggled] = useState<boolean | null>(null)
  const open = hasActiveItem || (userToggled ?? group.defaultOpen !== false)

  return (
    <Collapsible
      open={open}
      onOpenChange={setUserToggled}
      className="group/collapsible"
    >
      <SidebarGroup>
        <SidebarGroupLabel
          className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          asChild
        >
          <CollapsibleTrigger>
            {group.label}
            <ChevronRight className="ml-auto transition-transform group-data-open/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <NavItemButton
                    item={item}
                    isActive={isItemActive(item, pathname)}
                    badge={item.badgeKey ? badges?.[item.badgeKey] : undefined}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

export function NavMain({ groups, badges }: { groups: NavGroup[]; badges?: Record<string, number> }) {
  const location = useLocation()

  return (
    <>
      {groups.map((group, i) =>
        group.label ? (
          <CollapsibleNavGroup
            key={group.label}
            group={group}
            pathname={location.pathname}
            badges={badges}
          />
        ) : (
          <SidebarGroup key={i}>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <NavItemButton
                    item={item}
                    isActive={isItemActive(item, location.pathname)}
                    badge={item.badgeKey ? badges?.[item.badgeKey] : undefined}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ),
      )}
    </>
  )
}
