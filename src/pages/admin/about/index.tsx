import { useEffect, useState } from "react"
import { BookOpen, ExternalLink, Globe } from "lucide-react"
import { SiGithub } from "@icons-pack/react-simple-icons"
import Markdown from "react-markdown"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { UpdateSection } from "./update-section"
import { getAdminChangelog, getAdminSystemLicense, getAdminSystemUpdateCheck } from "@/api"
import type { SystemLicenseInfoResponse } from "@/api"
import { toast } from "sonner"

const links = [
  {
    label: "Novaix 官网",
    url: "https://novaix.cc",
    description: "了解产品功能、最新动态与使用指南",
    icon: Globe,
  },
  {
    label: "产品文档",
    url: "https://docs.huohuastudio.com/novaix",
    description: "查阅部署指南、功能说明与配置参考",
    icon: BookOpen,
  },
  {
    label: "GitHub",
    url: "https://github.com/huohuastudio/novaix-releases",
    description: "下载最新版本与查看更新记录",
    icon: SiGithub,
  },
]

function formatExpiry(expiresAt: number | undefined | null): string {
  if (expiresAt == null) return "永久"
  return new Date(expiresAt * 1000).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export default function About() {
  useBreadcrumb([{ label: "关于" }])
  const { site_name: siteName, demo_mode } = useSiteSettings()
  const isDemo = demo_mode === 'true'
  const [bypassed, setBypassed] = useState(false)
  const [bypassKey, setBypassKey] = useState('')
  const [licenseInfo, setLicenseInfo] = useState<SystemLicenseInfoResponse | null>()
  const [activeTab, setActiveTab] = useState("overview")
  const [changelog, setChangelog] = useState<string | null>(null)
  const [changelogLoading, setChangelogLoading] = useState(false)
  const [changelogError, setChangelogError] = useState(false)

  useEffect(() => {
    if (activeTab !== "update" || changelog !== null || changelogError) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
    setChangelogLoading(true)
    getAdminChangelog()
      .then((res) => setChangelog((res.data as string) || ""))
      .catch(() => setChangelogError(true))
      .finally(() => setChangelogLoading(false))
  }, [activeTab, changelog, changelogError])

  useEffect(() => {
    getAdminSystemLicense()
      .then(({ data: res }) => {
        setLicenseInfo(res?.code === 0 && res.data ? res.data : null)
      })
      .catch(() => setLicenseInfo(null))
  }, [])

  useEffect(() => {
    if (!isDemo) return
    const key = new URLSearchParams(window.location.search).get('bypass_key')
    if (!key) return
    getAdminSystemUpdateCheck({ query: { bypass_key: key } as never })
      .then(({ data: res }) => {
        if (res?.code === 0) {
          setBypassed(true)
          setBypassKey(key)
          toast.success('旁路验证成功，已解锁系统更新')
        }
      })
      .catch(() => {
        toast.error('旁路密钥无效')
      })
  }, [isDemo])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">关于</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          系统信息与版本更新
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="update">系统更新</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-6">
          <section>
            <h3 className="text-base font-medium">系统信息</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              当前运行的系统版本与基本信息
            </p>
            <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
              <span className="text-muted-foreground">系统名称</span>
              <span className="font-medium">{siteName}</span>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-base font-medium">授权信息</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              当前系统的授权状态与有效期
            </p>
            {licenseInfo === undefined ? (
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
                <span className="text-muted-foreground">版本</span>
                <span className="font-medium">
                  {licenseInfo?.edition === "paid" ? (
                    <span className="text-green-600 dark:text-green-400">授权版</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">免费版</span>
                  )}
                </span>
                {licenseInfo?.licensed && (
                  <>
                    <span className="text-muted-foreground">授权套餐</span>
                    <span className="font-medium">{licenseInfo.plan || "-"}</span>
                    <span className="text-muted-foreground">到期时间</span>
                    <span className="font-medium">{formatExpiry(licenseInfo.expires_at)}</span>
                  </>
                )}
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-base font-medium">产品介绍</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {siteName} 是一套商业化 IDC
              管理系统，面向中小型 VPS
              服务商，提供节点管理、实例生命周期管理、计费订单、工单系统等一站式解决方案。单文件部署，开箱即用。
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="text-base font-medium">相关链接</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              访问以下链接了解更多
            </p>
            <div className="mt-4 space-y-2">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
                >
                  <link.icon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{link.label}</div>
                    <div className="text-muted-foreground text-xs">
                      {link.description}
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="update" className="space-y-8 mt-6">
          <UpdateSection locked={isDemo && !bypassed} bypassKey={bypassKey} />

          <Separator />

          <section>
            <h3 className="text-base font-medium">更新日志</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              查看系统版本更新记录
            </p>
            {changelogLoading || changelog === null ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : changelogError ? (
              <p className="mt-4 text-sm text-destructive">加载更新日志失败，请稍后重试</p>
            ) : changelog ? (
              <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-md border p-4 text-sm markdown-body">
                <Markdown>{changelog}</Markdown>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">暂无更新日志</p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
