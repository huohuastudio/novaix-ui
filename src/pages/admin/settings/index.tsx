import { Routes, Route, Link, useParams, Navigate } from "react-router-dom"
import {
  Globe,
  Mail,
  FileText,
  MailOpen,
  CreditCard,
  Languages,
  Timer,
  Shield,
  Bell,
  Database,
  Globe2,
  Users,
  UserPlus,
  Wrench,
  Scale,
  Headset,
  LayoutDashboard,
  LifeBuoy,
  Fingerprint,
  MessageSquare,
  Send,
  HardDrive,
  Server,
  SlidersHorizontal,
  LogIn,
  ShieldCheck,
} from "lucide-react"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useAdminPath } from "@/hooks/use-site-settings"
import { HelpLink } from "@/components/help-doc"
import { SiteSection } from "./sections/site"
import { HomepageSection } from "./sections/homepage"
import { SmtpSection } from "./sections/smtp"
import { EmailTemplateSection } from "./sections/email-templates"
import { MailInboundSection } from "./sections/mail-inbound"
import { PaymentSection } from "./sections/payment"
import { LocaleSection } from "./sections/locale"
import { LifecycleSection } from "./sections/lifecycle"
import { SecuritySection } from "./sections/security"
import { AlertSection } from "./sections/alert"
import { NotifySection } from "./sections/notify"
import { BackupSection } from "./sections/backup"
import { StorageSection } from "./sections/storage"
import { RescueSection } from "./sections/rescue"
import { RDNSSection } from "./sections/rdns"
import { AgentSection } from "./sections/agent"
import { KYCSection } from "./sections/kyc"
import { CaptchaSection } from "./sections/captcha"
import { SMSSection } from "./sections/sms"
import { RegistrationSection } from "./sections/registration"
import { MaintenanceSection } from "./sections/maintenance"
import { LegalSection } from "./sections/legal"
import { AdvancedSection } from "./sections/advanced"
import { InstanceSection } from "./sections/instance"
import { OAuthSection } from "./sections/oauth"
import { TicketSection } from "./sections/ticket"

interface SettingItem {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
  docPath?: string
}

interface SettingGroup {
  label: string
  tourId: string
  items: SettingItem[]
}

const settingGroups: SettingGroup[] = [
  {
    label: "基础设置",
    tourId: "settings-basic",
    items: [
      { id: "site", label: "站点信息", description: "站点名称、URL、Logo、Favicon", icon: Globe, component: SiteSection, docPath: "/novaix/setting" },
      { id: "homepage", label: "首页内容", description: "Hero 区域、功能特性、FAQ、CTA", icon: LayoutDashboard, component: HomepageSection, docPath: "/novaix/setting" },
      { id: "locale", label: "货币与本地化", description: "货币符号、小数位数、时区", icon: Languages, component: LocaleSection, docPath: "/novaix/setting" },
      { id: "legal", label: "服务条款", description: "服务条款与隐私政策", icon: Scale, component: LegalSection, docPath: "/novaix/setting" },
      { id: "maintenance", label: "维护模式", description: "开启或关闭系统维护状态", icon: Wrench, component: MaintenanceSection, docPath: "/novaix/setting" },
      { id: "advanced", label: "高级设置", description: "API 文档、更新镜像等系统级配置", icon: SlidersHorizontal, component: AdvancedSection, docPath: "/novaix/config" },
    ],
  },
  {
    label: "通知与消息",
    tourId: "settings-notify",
    items: [
      { id: "smtp", label: "邮件通知", description: "SMTP 发信渠道配置", icon: Mail, component: SmtpSection, docPath: "/novaix/mail" },
      { id: "email_templates", label: "邮件模板", description: "自定义邮件通知模板内容", icon: FileText, component: EmailTemplateSection, docPath: "/novaix/email-template" },
      { id: "mail_inbound", label: "邮件回复", description: "接收用户邮件回复到工单", icon: MailOpen, component: MailInboundSection, docPath: "/novaix/mail" },
      { id: "notify", label: "通知渠道", description: "Webhook、Telegram 等通知方式", icon: Send, component: NotifySection, docPath: "/novaix/notify" },
      { id: "sms", label: "短信", description: "短信验证码发送渠道", icon: MessageSquare, component: SMSSection, docPath: "/novaix/sms" },
      { id: "alert", label: "告警配置", description: "系统告警规则与推送方式", icon: Bell, component: AlertSection, docPath: "/novaix/monitoring" },
      { id: "ticket", label: "工单", description: "工单部门分类与 SLA 响应时限", icon: Headset, component: TicketSection, docPath: "/novaix/ticket" },
    ],
  },
  {
    label: "财务与支付",
    tourId: "settings-finance",
    items: [
      { id: "payment", label: "支付渠道", description: "在线支付方式与网关配置", icon: CreditCard, component: PaymentSection, docPath: "/novaix/payment" },
      { id: "agent", label: "代理系统", description: "分销代理佣金与规则", icon: Users, component: AgentSection, docPath: "/novaix/agent" },
    ],
  },
  {
    label: "安全与用户",
    tourId: "settings-security",
    items: [
      { id: "security", label: "安全", description: "登录策略、会话超时、锁定规则", icon: Shield, component: SecuritySection },
      { id: "captcha", label: "人机验证", description: "配置验证码服务，防止自动化攻击", icon: ShieldCheck, component: CaptchaSection },
      { id: "registration", label: "注册设置", description: "用户注册方式与限制", icon: UserPlus, component: RegistrationSection },
      { id: "oauth", label: "社会化登录", description: "GitHub、Google、微信等第三方登录", icon: LogIn, component: OAuthSection, docPath: "/novaix/oauth" },
      { id: "kyc", label: "实名认证", description: "KYC 身份验证服务配置", icon: Fingerprint, component: KYCSection, docPath: "/novaix/kyc" },
    ],
  },
  {
    label: "实例与运维",
    tourId: "settings-ops",
    items: [
      { id: "instance", label: "实例创建", description: "主机名、密码自动生成规则", icon: Server, component: InstanceSection, docPath: "/novaix/instance" },
      { id: "lifecycle", label: "实例生命周期", description: "到期、暂停、删除等策略", icon: Timer, component: LifecycleSection, docPath: "/novaix/setting" },
      { id: "backup", label: "自动备份", description: "定时备份策略与保留周期", icon: Database, component: BackupSection, docPath: "/novaix/backup" },
      { id: "storage", label: "对象存储", description: "S3 兼容存储用于镜像归档", icon: HardDrive, component: StorageSection, docPath: "/novaix/storage" },
      { id: "rescue", label: "救援模式", description: "实例救援启动盘配置", icon: LifeBuoy, component: RescueSection, docPath: "/novaix/iso" },
      { id: "rdns", label: "rDNS", description: "反向 DNS 解析设置", icon: Globe2, component: RDNSSection, docPath: "/novaix/rdns" },
    ],
  },
]

const allItems = settingGroups.flatMap((g) => g.items)

function SettingsIndex() {
  useBreadcrumb([{ label: "系统设置" }])

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
        <HelpLink path="/novaix/setting" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">管理系统的全局配置参数</p>

      <div className="mt-8 space-y-10">
        {settingGroups.map((group) => (
          <section key={group.label} data-tour={group.tourId}>
            <h3 className="text-base font-semibold mb-4">{group.label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.id}
                    to={item.id}
                    className="group flex items-start gap-3 rounded-lg p-3 -m-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-primary group-hover:underline">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function SettingsDetail() {
  const { section } = useParams<{ section: string }>()
  const adminPath = useAdminPath()
  const item = allItems.find((i) => i.id === section)

  useBreadcrumb(
    item
      ? [{ label: "系统设置", href: `${adminPath}/settings` }, { label: item.label }]
      : [{ label: "系统设置" }],
  )

  if (!item) return <Navigate to={`${adminPath}/settings`} replace />

  const Component = item.component

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <div className="mb-6">
        <Link
          to={`${adminPath}/settings`}
          className="text-sm text-primary hover:underline"
        >
          设置
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{item.label}</h1>
          {item.docPath && <HelpLink path={item.docPath} />}
        </div>
      </div>
      <Component />
    </div>
  )
}

export default function Settings() {
  return (
    <Routes>
      <Route index element={<SettingsIndex />} />
      <Route path=":section" element={<SettingsDetail />} />
    </Routes>
  )
}
