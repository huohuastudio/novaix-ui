import { useEffect, useRef, useState } from "react"
import { HardDrive, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export type SectionId =
  | "main"
  | "disk"
  | "volume"
  | "network"
  | "gpu"
  | "proxy"
  | "other-devices"
  | "resource-limits"
  | "security"
  | "snapshots"
  | "migration"
  | "boot"
  | "advanced"
  | "cloud-init"

export interface NavItem {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  group?: string
}

const deviceSectionIds = new Set<SectionId>(["disk", "volume", "network", "gpu", "proxy", "other-devices"])

interface FormNavLayoutProps {
  navItems: NavItem[]
  sections: Record<SectionId, React.ReactNode>
  actions?: React.ReactNode
}

export function FormNavLayout({ navItems, sections, actions }: FormNavLayoutProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("main")
  const [devicesOpen, setDevicesOpen] = useState(true)

  const handleNavClick = (id: SectionId) => {
    setActiveSection(id)
    if (deviceSectionIds.has(id)) {
      setDevicesOpen(true)
    }
  }

  return (
    <>
      <MobileTabNav
        items={navItems}
        activeSection={activeSection}
        onSelect={handleNavClick}
      />

      <div className="flex gap-8">
        <nav className="hidden lg:block w-56 shrink-0 space-y-1 sticky top-0 self-start" data-tour="create-instance-nav">
          <NavButton
            item={navItems[0]}
            active={activeSection === navItems[0].id}
            onClick={() => handleNavClick(navItems[0].id)}
          />

          <Collapsible open={devicesOpen} onOpenChange={setDevicesOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  deviceSectionIds.has(activeSection)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <HardDrive className="size-4" />
                <span className="flex-1 text-left">设备</span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    devicesOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 space-y-1 mt-1">
                {navItems
                  .filter((i) => i.group === "设备")
                  .map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      active={activeSection === item.id}
                      onClick={() => handleNavClick(item.id)}
                    />
                  ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {navItems
            .filter((i) => !i.group && i.id !== navItems[0].id)
            .map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeSection === item.id}
                onClick={() => handleNavClick(item.id)}
              />
            ))}
        </nav>

        <div className="flex-1 min-w-0">
          <div className="max-w-3xl">
            {navItems.map((item) => (
              <SectionPanel key={item.id} active={activeSection === item.id}>
                {sections[item.id]}
              </SectionPanel>
            ))}

          </div>
          {actions && (
            <div className="sticky bottom-0 border-t bg-popover py-3 mt-8">
              <div className="flex items-center gap-3 max-w-3xl">
                {actions}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SectionPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div className={active ? undefined : "hidden"}>{children}</div>
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </button>
  )
}

function MobileTabNav({
  items,
  activeSection,
  onSelect,
}: {
  items: NavItem[]
  activeSection: SectionId
  onSelect: (id: SectionId) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = activeRef.current
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
      container.scrollTo({ left, behavior: "smooth" })
    }
  }, [activeSection])

  return (
    <div className="lg:hidden -mx-4 sm:-mx-6 mb-6">
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto px-4 sm:px-6 pb-2 no-scrollbar"
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
