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
  Receipt,
  MapPin,
  ArrowLeftRight,
  Cable,
  PackageOpen,
  Boxes,
  ClipboardList,
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
      settingKey: "self_hosted_enabled",
      items: [
        { title: "区域管理", url: `${basePath}/regions`, icon: MapPin },
        { title: "节点管理", url: `${basePath}/nodes`, icon: Server },
        { title: "实例管理", url: `${basePath}/instances`, icon: MonitorCog },
        { title: "镜像管理", url: `${basePath}/images`, icon: Disc3 },
        { title: "ISO 镜像", url: `${basePath}/isos`, icon: Disc },
      ],
    },
    {
      label: "网络",
      settingKey: "self_hosted_enabled",
      items: [
        { title: "IP 池管理", url: `${basePath}/ips`, icon: Network },
        { title: "共享 IP", url: `${basePath}/shared-ips`, icon: Globe, featureKey: "shared_ip" },
        { title: "私有网络", url: `${basePath}/vpcs`, icon: Shield, featureKey: "vpc" },
      ],
    },
    {
      label: "供应商",
      settingKey: "supplier_resale_enabled",
      items: [
        { title: "供应商连接", url: `${basePath}/supplier/connections`, icon: Cable, featureKey: "supplier_resale" },
        { title: "模块商品", url: `${basePath}/supplier/products`, icon: PackageOpen, featureKey: "supplier_resale" },
        // 存量服务与待处理不受授权限制：授权失效后仍需处理已售服务的续费、操作与人工核对
        { title: "服务管理", url: `${basePath}/supplier/services`, icon: Boxes },
        { title: "待处理", url: `${basePath}/supplier/operations`, icon: ClipboardList, badgeKey: "supplier_attention" },
      ],
    },
    {
      label: "用户",
      items: [
        { title: "用户管理", url: `${basePath}/users`, icon: Users },
        { title: "代理管理", url: `${basePath}/agents`, icon: UserCheck, featureKey: "agents" },
        { title: "工单系统", url: `${basePath}/tickets`, icon: MessageSquareText },
      ],
    },
    {
      label: "商品",
      items: [
        { title: "套餐管理", url: `${basePath}/plans`, icon: Package, settingKey: "self_hosted_enabled" },
        { title: "流量包", url: `${basePath}/traffic-packages`, icon: Gauge, settingKey: "self_hosted_enabled" },
        { title: "优惠券", url: `${basePath}/coupons`, icon: Ticket },
      ],
    },
    {
      label: "财务",
      items: [
        { title: "订单管理", url: `${basePath}/orders`, icon: ShoppingCart },
        { title: "支付记录", url: `${basePath}/payments`, icon: CreditCard },
        { title: "发票管理", url: `${basePath}/invoices`, icon: Receipt },
        { title: "转移管理", url: `${basePath}/push-transfers`, icon: ArrowLeftRight, settingKey: "self_hosted_enabled" },
      ],
    },
    {
      label: "站点",
      items: [
        { title: "内容管理", url: `${basePath}/cms`, icon: PenSquare },
        { title: "主题", url: `${basePath}/themes`, icon: Palette },
      ],
    },
    {
      label: "系统",
      items: [
        { title: "插件", url: `${basePath}/plugins`, icon: Blocks, featureKey: "plugins" },
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
