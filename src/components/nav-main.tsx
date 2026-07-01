import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Lock } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useFeatureAllowed } from "@/hooks/use-edition"
import { ActivationDialog } from "@/components/activation-dialog"
import type { LucideIcon } from "lucide-react"

export type NavGroup = {
  label?: string
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

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation()

  return (
    <>
      {groups.map((group, i) => (
        <SidebarGroup key={group.label ?? i}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <NavItemButton
                  item={item}
                  isActive={item.exact ? location.pathname === item.url : location.pathname === item.url || location.pathname.startsWith(item.url + "/")}
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
