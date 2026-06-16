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
}

interface SettingGroup {
  label: string
  items: SettingItem[]
}

const settingGroups: SettingGroup[] = [
  {
    label: "基础设置",
    items: [
      { id: "site", label: "站点信息", description: "站点名称、URL、Logo、Favicon", icon: Globe, component: SiteSection },
      { id: "homepage", label: "首页内容", description: "Hero 区域、功能特性、FAQ、CTA", icon: LayoutDashboard, component: HomepageSection },
      { id: "locale", label: "货币与本地化", description: "货币符号、小数位数、时区", icon: Languages, component: LocaleSection },
      { id: "legal", label: "服务条款", description: "服务条款与隐私政策", icon: Scale, component: LegalSection },
      { id: "maintenance", label: "维护模式", description: "开启或关闭系统维护状态", icon: Wrench, component: MaintenanceSection },
      { id: "advanced", label: "高级设置", description: "API 文档、更新镜像等系统级配置", icon: SlidersHorizontal, component: AdvancedSection },
    ],
  },
  {
    label: "通知与消息",
    items: [
      { id: "smtp", label: "邮件通知", description: "SMTP 发信渠道配置", icon: Mail, component: SmtpSection },
      { id: "email_templates", label: "邮件模板", description: "自定义邮件通知模板内容", icon: FileText, component: EmailTemplateSection },
      { id: "mail_inbound", label: "邮件回复", description: "接收用户邮件回复到工单", icon: MailOpen, component: MailInboundSection },
      { id: "notify", label: "通知渠道", description: "Webhook、Telegram 等通知方式", icon: Send, component: NotifySection },
      { id: "sms", label: "短信", description: "短信验证码发送渠道", icon: MessageSquare, component: SMSSection },
      { id: "alert", label: "告警配置", description: "系统告警规则与推送方式", icon: Bell, component: AlertSection },
      { id: "ticket", label: "工单", description: "工单部门分类与 SLA 响应时限", icon: Headset, component: TicketSection },
    ],
  },
  {
    label: "财务与支付",
    items: [
      { id: "payment", label: "支付渠道", description: "在线支付方式与网关配置", icon: CreditCard, component: PaymentSection },
      { id: "agent", label: "代理系统", description: "分销代理佣金与规则", icon: Users, component: AgentSection },
    ],
  },
  {
    label: "安全与用户",
    items: [
      { id: "security", label: "安全", description: "登录策略、会话超时、锁定规则", icon: Shield, component: SecuritySection },
      { id: "captcha", label: "人机验证", description: "配置验证码服务，防止自动化攻击", icon: ShieldCheck, component: CaptchaSection },
      { id: "registration", label: "注册设置", description: "用户注册方式与限制", icon: UserPlus, component: RegistrationSection },
      { id: "oauth", label: "社会化登录", description: "GitHub、Google、微信等第三方登录", icon: LogIn, component: OAuthSection },
      { id: "kyc", label: "实名认证", description: "KYC 身份验证服务配置", icon: Fingerprint, component: KYCSection },
    ],
  },
  {
    label: "实例与运维",
    items: [
      { id: "instance", label: "实例创建", description: "主机名、密码自动生成规则", icon: Server, component: InstanceSection },
      { id: "lifecycle", label: "实例生命周期", description: "到期、暂停、删除等策略", icon: Timer, component: LifecycleSection },
      { id: "backup", label: "自动备份", description: "定时备份策略与保留周期", icon: Database, component: BackupSection },
      { id: "storage", label: "对象存储", description: "S3 兼容存储用于镜像归档", icon: HardDrive, component: StorageSection },
      { id: "rescue", label: "救援模式", description: "实例救援启动盘配置", icon: LifeBuoy, component: RescueSection },
      { id: "rdns", label: "rDNS", description: "反向 DNS 解析设置", icon: Globe2, component: RDNSSection },
    ],
  },
]

const allItems = settingGroups.flatMap((g) => g.items)

function SettingsIndex() {
  useBreadcrumb([{ label: "系统设置" }])

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-6">
      <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
      <p className="mt-1 text-sm text-muted-foreground">管理系统的全局配置参数</p>

      <div className="mt-8 space-y-10">
        {settingGroups.map((group) => (
          <section key={group.label}>
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
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{item.label}</h1>
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
