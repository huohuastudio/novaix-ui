import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  Download,

  Info,
  Loader2,
  Palette,
  RefreshCw,
  Store,
  Trash2,
  Upload,
} from "lucide-react"
import {
  getAdminThemes,
  postAdminThemesReload,
  getAdminThemesMarketplace,
  putAdminThemesActive,
  postAdminThemesUpload,
  postAdminThemesMarketplaceByIdInstall,
  deleteAdminThemesById,
} from "@/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { getErrorMessage } from "@/lib/utils"

interface ThemeInfo {
  id?: string
  name?: string
  version?: string
  description?: string
  author?: { name?: string; email?: string; url?: string }
  homepage?: string
  requires?: string
  active?: boolean
  has_screenshot?: boolean
  error?: string
}

interface MarketplaceItem {
  id?: string
  name?: string
  version?: string
  description?: string
  author?: { name?: string; url?: string }
  requires?: string
  download_url?: string
  installed?: boolean
  installed_version?: string
}

function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url
  } catch { /* invalid URL */ }
  return undefined
}

function PageSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-md overflow-hidden">
          <Skeleton className="h-40 w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-8 w-20 mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ThemeCardShell({
  name,
  version,
  description,
  author,
  screenshotSrc,
  className,
  badges,
  children,
}: {
  name?: string
  version?: string
  description?: string
  author?: { name?: string; url?: string }
  screenshotSrc?: string
  className?: string
  badges?: React.ReactNode
  children?: React.ReactNode
}) {
  const authorHref = safeHref(author?.url)
  return (
    <div className={`border rounded-md overflow-hidden ${className ?? ""}`}>
      <div className="h-40 bg-muted flex items-center justify-center relative">
        {screenshotSrc ? (
          <img src={screenshotSrc} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Palette className="size-10 text-muted-foreground/30" />
        )}
        {badges}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{name}</span>
          {version && <span className="text-xs text-muted-foreground">v{version}</span>}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
        {author?.name && (
          <div className="text-xs text-muted-foreground">
            {authorHref ? (
              <a href={authorHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {author.name}
              </a>
            ) : (
              author.name
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function ThemeCard({
  theme,
  onActivate,
  onUninstall,
  activating,
}: {
  theme: ThemeInfo
  onActivate: (id: string) => void
  onUninstall: (theme: ThemeInfo) => void
  activating: boolean
}) {
  return (
    <ThemeCardShell
      name={theme.name}
      version={theme.version}
      description={theme.description}
      author={theme.author}
      screenshotSrc={theme.has_screenshot ? `/api/v1/admin/themes/${theme.id}/screenshot` : undefined}
      className={theme.active ? "ring-2 ring-primary" : ""}
      badges={theme.active ? (
        <Badge className="absolute top-2 right-2">
          <Check className="size-3 mr-1" />
          当前使用
        </Badge>
      ) : undefined}
    >
      {theme.error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          <span>{theme.error}</span>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        {!theme.active && !theme.error && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onActivate(theme.id ?? "")}
            disabled={activating}
          >
            {activating && <Loader2 className="size-3.5 animate-spin" />}
            启用
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onUninstall(theme)}
        >
          <Trash2 className="size-3.5" />
          卸载
        </Button>
      </div>
    </ThemeCardShell>
  )
}

function InstalledThemes({
  themes,
  loading,
  onRefresh,
}: {
  themes: ThemeInfo[]
  loading: boolean
  onRefresh: () => void
}) {
  const [activating, setActivating] = useState<string | null>(null)
  const [uninstallTarget, setUninstallTarget] = useState<ThemeInfo | null>(null)
  const [uninstalling, setUninstalling] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasActiveTheme = themes.some((t) => t.active)

  const handleSetActive = async (id: string) => {
    setActivating(id || "__reset__")
    try {
      const { data: res } = await putAdminThemesActive({ body: { id } })
      if (res?.code === 0) {
        toast.success(id ? "主题已切换，请刷新页面查看效果" : "已恢复默认主题，请刷新页面查看效果")
        onRefresh()
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setActivating(null)
    }
  }

  const handleUninstall = async () => {
    if (!uninstallTarget?.id) return
    setUninstalling(true)
    try {
      const { data: res } = await deleteAdminThemesById({ path: { id: uninstallTarget.id } })
      if (res?.code === 0) {
        toast.success("主题已卸载")
        if (uninstallTarget.active) {
          toast.info("活跃主题已卸载，已恢复默认主题")
        }
        onRefresh()
      } else {
        toast.error(res?.message ?? "卸载失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "卸载失败"))
    } finally {
      setUninstalling(false)
      setUninstallTarget(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    if (!file.name.endsWith(".zip")) {
      toast.error("请上传 .zip 格式的主题包")
      return
    }

    setUploading(true)
    try {
      const { data: res } = await postAdminThemesUpload({ body: { file } })
      if (res?.code === 0) {
        toast.success("主题安装成功")
        onRefresh()
      } else {
        toast.error(res?.message ?? "安装失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "上传失败"))
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          上传安装
        </Button>
        {hasActiveTheme && (
          <Button
            variant="outline"
            onClick={() => handleSetActive("")}
            disabled={activating === "__reset__"}
          >
            {activating === "__reset__" && <Loader2 className="size-4 animate-spin" />}
            恢复默认
          </Button>
        )}
      </div>

      {loading ? (
        <PageSkeleton />
      ) : themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <Info className="size-5 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">暂无已安装主题</p>
          <p className="text-xs text-muted-foreground mt-1">
            可通过上传安装或从主题市场安装
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              onActivate={handleSetActive}
              onUninstall={setUninstallTarget}
              activating={activating === t.id}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!uninstallTarget} onOpenChange={(open) => !open && setUninstallTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>卸载主题</AlertDialogTitle>
            <AlertDialogDescription>
              确定要卸载「{uninstallTarget?.name}」吗？
              {uninstallTarget?.active && "该主题当前正在使用，卸载后将恢复默认主题。"}
              主题文件将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uninstalling}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleUninstall} disabled={uninstalling}>
              {uninstalling && <Loader2 className="size-4 animate-spin" />}
              确认卸载
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Marketplace({ onInstalled }: { onInstalled: () => void }) {
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<Record<string, boolean>>({})

  const loadMarketplace = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await getAdminThemesMarketplace()
      if (res?.code === 0 && res.data) {
        setItems(res.data as MarketplaceItem[])
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "加载主题市场失败"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMarketplace() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadMarketplace])

  const handleInstall = async (item: MarketplaceItem) => {
    if (!item.id) return
    setInstalling((prev) => ({ ...prev, [item.id!]: true }))
    try {
      const { data: res } = await postAdminThemesMarketplaceByIdInstall({
        path: { id: item.id },
      })
      if (res?.code === 0) {
        toast.success(`${item.name} 安装成功`)
        onInstalled()
        loadMarketplace()
      } else {
        toast.error(res?.message ?? "安装失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "安装失败"))
    } finally {
      setInstalling((prev) => ({ ...prev, [item.id!]: false }))
    }
  }

  return loading ? (
    <PageSkeleton />
  ) : items.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
      <Store className="size-5 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">主题市场暂无可用主题</p>
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const hasUpdate = item.installed && item.installed_version !== item.version
        return (
          <ThemeCardShell
            key={item.id}
            name={item.name}
            version={item.version}
            description={item.description}
            author={item.author}
            badges={item.installed ? (
              <Badge variant="outline" className="absolute top-2 right-2 text-[11px] px-1.5 py-0">
                已安装{item.installed_version ? ` v${item.installed_version}` : ""}
              </Badge>
            ) : undefined}
          >
            <div className="pt-1">
              {item.installed && !hasUpdate ? (
                <Button variant="outline" disabled>
                  已安装
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={hasUpdate ? "default" : "outline"}
                  onClick={() => handleInstall(item)}
                  disabled={installing[item.id ?? ""]}
                >
                  {installing[item.id ?? ""] ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {hasUpdate ? "更新" : "安装"}
                </Button>
              )}
            </div>
          </ThemeCardShell>
        )
      })}
    </div>
  )
}

export default function Themes() {
  useBreadcrumb([{ label: "主题管理" }])

  const [themes, setThemes] = useState<ThemeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("installed")

  const loadThemes = useCallback(async (rescan = false) => {
    setLoading(true)
    try {
      const { data: res } = rescan
        ? await postAdminThemesReload()
        : await getAdminThemes()
      if (res?.code === 0 && res.data) {
        setThemes(res.data as ThemeInfo[])
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "加载主题列表失败"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadThemes() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadThemes])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">主题管理</h1>
            <HelpLink path="/novaix/theme" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            自定义前端界面外观，安装和切换主题
          </p>
        </div>
        <Button variant="outline" onClick={() => loadThemes(true)} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="installed">已安装</TabsTrigger>
          <TabsTrigger value="marketplace">
            <Store className="size-3.5" />
            主题市场
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "installed" ? (
        <InstalledThemes themes={themes} loading={loading} onRefresh={loadThemes} />
      ) : (
        <Marketplace onInstalled={loadThemes} />
      )}
    </div>
  )
}
