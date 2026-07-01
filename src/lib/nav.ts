import {
  LayoutDashboard,
  Server,
  Package,
  Users,
  ShoppingCart,
  MonitorCog,
  Settings2Icon,
  Network,
  Disc3,
  Disc,
  ScrollText,
  MessageSquareText,
  Ticket,
  Bell,
  UserCheck,
  CreditCard,
  Info,
  Plug,
  Globe,
  Gauge,
  ListChecks,
  Shield,
  Blocks,
  Palette,
  PenSquare,
} from "lucide-react"
import type { NavGroup } from "@/components/nav-main"

export function buildNavGroups(basePath: string): NavGroup[] {
  return [
    {
      items: [
        { title: "仪表盘", url: basePath, icon: LayoutDashboard, exact: true },
      ],
    },
    {
      label: "资源管理",
      items: [
        { title: "节点管理", url: `${basePath}/nodes`, icon: Server },
        { title: "实例管理", url: `${basePath}/instances`, icon: MonitorCog },
        { title: "IP 池管理", url: `${basePath}/ips`, icon: Network },
        { title: "共享 IP", url: `${basePath}/shared-ips`, icon: Globe, featureKey: "shared_ip" },
        { title: "私有网络", url: `${basePath}/vpcs`, icon: Shield, featureKey: "vpc" },
        { title: "镜像管理", url: `${basePath}/images`, icon: Disc3 },
        { title: "ISO 镜像", url: `${basePath}/isos`, icon: Disc },
      ],
    },
    {
      label: "业务管理",
      items: [
        { title: "用户管理", url: `${basePath}/users`, icon: Users },
        { title: "订单管理", url: `${basePath}/orders`, icon: ShoppingCart },
        { title: "套餐管理", url: `${basePath}/plans`, icon: Package },
        { title: "流量包", url: `${basePath}/traffic-packages`, icon: Gauge },
        { title: "支付记录", url: `${basePath}/payments`, icon: CreditCard },
        { title: "优惠券", url: `${basePath}/coupons`, icon: Ticket },
        { title: "代理管理", url: `${basePath}/agents`, icon: UserCheck, featureKey: "agents" },
        { title: "工单系统", url: `${basePath}/tickets`, icon: MessageSquareText },
        { title: "内容管理", url: `${basePath}/cms`, icon: PenSquare },
      ],
    },
    {
      label: "系统",
      items: [
        { title: "插件", url: `${basePath}/plugins`, icon: Blocks, featureKey: "plugins" },
        { title: "主题", url: `${basePath}/themes`, icon: Palette },
        { title: "集成方", url: `${basePath}/integrations`, icon: Plug, featureKey: "integrations" },
        { title: "任务管理", url: `${basePath}/tasks`, icon: ListChecks },
        { title: "告警记录", url: `${basePath}/alerts`, icon: Bell, featureKey: "alerts" },
        { title: "操作日志", url: `${basePath}/logs`, icon: ScrollText },
        { title: "系统设置", url: `${basePath}/settings`, icon: Settings2Icon },
        { title: "关于", url: `${basePath}/about`, icon: Info },
      ],
    },
  ]
}
