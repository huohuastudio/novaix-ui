import { Link } from "react-router-dom"
import { Package, Server } from "lucide-react"
import { usePortalBusinessMode } from "@/hooks/use-portal-business-mode"

const tabs = [
  { key: "cloud", to: "/portal/purchase", label: "云服务器", icon: Server },
  { key: "services", to: "/portal/purchase/services", label: "其他服务", icon: Package },
] as const

/** 选购页顶部的"云服务器 | 其他服务"切换，仅在两类入口同时开启时显示（样式与实例详情页标签一致） */
export function PortalPurchaseSwitch({ active }: { active: "cloud" | "services" }) {
  const { cloud, shop } = usePortalBusinessMode()
  if (!cloud || !shop) return null

  return (
    <div className="flex gap-1 rounded-xl bg-background p-1 w-fit max-w-full overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to}
          replace
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
            active === tab.key
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <tab.icon className="size-3.5" />
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
