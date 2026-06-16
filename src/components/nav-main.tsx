import { useLocation, useNavigate } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { LucideIcon } from "lucide-react"

export type NavGroup = {
  label?: string
  items: {
    title: string
    url: string
    icon: LucideIcon
    exact?: boolean
  }[]
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      {groups.map((group, i) => (
        <SidebarGroup key={group.label ?? i}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={item.exact ? location.pathname === item.url : location.pathname === item.url || location.pathname.startsWith(item.url + "/")}
                  onClick={() => navigate(item.url)}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
