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
  items: {
    title: string
    url: string
    icon: LucideIcon
    exact?: boolean
    featureKey?: string
  }[]
}

function NavItemButton({
  item,
  isActive,
}: {
  item: NavGroup["items"][number]
  isActive: boolean
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
}: {
  group: NavGroup
  pathname: string
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

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation()

  return (
    <>
      {groups.map((group, i) =>
        group.label ? (
          <CollapsibleNavGroup
            key={group.label}
            group={group}
            pathname={location.pathname}
          />
        ) : (
          <SidebarGroup key={i}>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <NavItemButton
                    item={item}
                    isActive={isItemActive(item, location.pathname)}
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
