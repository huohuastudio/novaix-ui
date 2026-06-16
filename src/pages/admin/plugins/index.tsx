import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Info,
  ExternalLink,
  RefreshCw,
  Settings2,
  Loader2,
  Upload,
  Trash2,
  Download,
  Store,
  PackageOpen,
} from "lucide-react"
import {
  getAdminPlugins,
  getAdminPluginsMarketplace,
  getAdminProvidersByKind,
  putAdminPluginsByIdToggle,
  postAdminPluginsByIdReload,
  deleteAdminPluginsById,
  postAdminPluginsUpload,
  postAdminPluginsMarketplaceByIdInstall,
  type ProviderDescriptor,
} from "@/api"
import { useSettings } from "@/hooks/use-settings"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormSheet } from "@/components/form-sheet"
import { FieldGrid } from "@/components/provider-settings-form"
import { isFieldVisible, isSubmittable, validateField } from "@/lib/provider-field-utils"
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { isImpersonating } from "@/lib/auth"
import { getErrorMessage } from "@/lib/utils"

interface PluginInfo {
  id?: string
  name?: string
  version?: string
  description?: string
  type?: string
  author?: { name?: string; email?: string; url?: string }
  license?: string
  homepage?: string
  enabled?: boolean
  error?: string
}

interface MarketplaceItem {
  id?: string
  name?: string
  version?: string
  description?: string
  type?: string
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

const typeLabels: Record<string, string> = {
  payment: "支付",
  captcha: "验证码",
  sms: "短信",
  mail: "邮件",
  notify: "通知",
  kyc: "认证",
  oauth: "登录",
}

const allTypes = Object.keys(typeLabels)

function PageSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-4 p-4 border rounded-md">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function PluginConfigSheet({
  plugin,
  open,
  onOpenChange,
}: {
  plugin: PluginInfo
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [descriptor, setDescriptor] = useState<ProviderDescriptor | null>(null)
  const [loadingDesc, setLoadingDesc] = useState(false)

  const loadDescriptor = useCallback(async () => {
    if (!plugin.type || !plugin.id) return
    setLoadingDesc(true)
    try {
      const { data: res } = await getAdminProvidersByKind({ path: { kind: plugin.type } })
      if (res?.code === 0 && res.data) {
        setDescriptor(res.data.find((d) => d.name === plugin.id) ?? null)
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingDesc(false)
    }
  }, [plugin.type, plugin.id])

  useEffect(() => {
    if (open) loadDescriptor() // eslint-disable-line react-hooks/set-state-in-effect
  }, [open, loadDescriptor])

  const group = `${plugin.type}_${plugin.id}`
  const settings = useSettings(group)
  const { site_url: siteURL } = useSiteSettings()

  const configFields = descriptor?.fields?.filter((f) => f.key !== "enabled") ?? []

  const [errors, setErrors] = useState<Record<string, string>>({})

  const fieldValues: Record<string, string> = {}
  for (const f of configFields) {
    fieldValues[f.key ?? ""] = settings.data[`${group}_${f.key}`] ?? f.default ?? ""
  }

  const handleValidate = () => {
    const errs: Record<string, string> = {}
    for (const f of configFields) {
      if (!isSubmittable(f)) continue
      if (!isFieldVisible(f, fieldValues)) continue
      const val = settings.data[`${group}_${f.key}`] ?? f.default ?? ""
      const err = validateField(f, val)
      if (err) errs[f.key!] = err
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!configFields.length) return
    if (!handleValidate()) return
    const items: Record<string, string> = {}
    for (const f of configFields) {
      if (!isSubmittable(f)) continue
      if (!isFieldVisible(f, fieldValues)) continue
      const key = `${group}_${f.key}`
      items[key] = settings.data[key] ?? f.default ?? ""
    }
    const ok = await settings.save(items)
    if (ok) onOpenChange(false)
  }

  const isLoading = loadingDesc || settings.loading

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={plugin.name ?? "插件配置"}
      description={plugin.description ?? ""}
      footer={
        configFields.length > 0 && !isLoading ? (
          <Button onClick={handleSave} disabled={settings.saving}>
            {settings.saving && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 col-span-2" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : configFields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">该插件无需配置</p>
      ) : (
        <FieldGrid
          fields={configFields}
          fieldValues={fieldValues}
          errors={errors}
          getValue={(f) => settings.data[`${group}_${f.key}`] ?? f.default ?? ""}
          onChange={(f, v) => {
            settings.update(`${group}_${f.key}`, v)
            if (errors[f.key!]) setErrors((prev) => { const n = { ...prev }; delete n[f.key!]; return n })
          }}
          descriptorName={plugin.id}
          siteURL={siteURL}
        />
      )}
    </FormSheet>
  )
}

function InstalledPlugins({
  plugins,
  loading,
  onRefresh,
  onPluginsChange,
}: {
  plugins: PluginInfo[]
  loading: boolean
  onRefresh: () => void
  onPluginsChange: (plugins: PluginInfo[]) => void
}) {
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [reloading, setReloading] = useState<Record<string, boolean>>({})
  const [activeType, setActiveType] = useState("all")
  const [configPlugin, setConfigPlugin] = useState<PluginInfo | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [uninstallTarget, setUninstallTarget] = useState<PluginInfo | null>(null)
  const [uninstalling, setUninstalling] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const filtered = useMemo(() => {
    if (activeType === "all") return plugins
    return plugins.filter((p) => p.type === activeType)
  }, [plugins, activeType])

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setToggling((prev) => ({ ...prev, [id]: true }))
    try {
      const { data: res } = await putAdminPluginsByIdToggle({
        path: { id },
        body: { enabled: !currentEnabled },
      })
      if (res?.code === 0) {
        onPluginsChange(
          plugins.map((p) => (p.id === id ? { ...p, enabled: !currentEnabled } : p)),
        )
        toast.success(!currentEnabled ? "已启用插件" : "已禁用插件")
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setToggling((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleReload = async (id: string) => {
    setReloading((prev) => ({ ...prev, [id]: true }))
    try {
      const { data: res } = await postAdminPluginsByIdReload({ path: { id } })
      if (res?.code === 0) {
        toast.success("插件已重载")
        onRefresh()
      } else {
        toast.error(res?.message ?? "重载失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "重载失败"))
    } finally {
      setReloading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const handleUninstall = async () => {
    if (!uninstallTarget?.id) return
    setUninstalling(true)
    try {
      const { data: res } = await deleteAdminPluginsById({ path: { id: uninstallTarget.id } })
      if (res?.code === 0) {
        toast.success("插件已卸载")
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
      toast.error("请上传 .zip 格式的插件包")
      return
    }

    setUploading(true)
    try {
      const { data: res } = await postAdminPluginsUpload({
        body: { file },
      })
      if (res?.code === 0) {
        toast.success("插件安装成功")
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

  const handleExport = async (id: string) => {
    const token = isImpersonating()
      ? sessionStorage.getItem("token")
      : localStorage.getItem("token")
    try {
      const res = await fetch(`/api/v1/admin/plugins/${id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        toast.error(body?.message || "导出失败")
        return
      }
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `${id}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      toast.error(getErrorMessage(err, "导出失败"))
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeType} onValueChange={setActiveType} className="min-w-0">
          <TabsList className="max-w-full overflow-x-auto overflow-y-hidden no-scrollbar justify-start">
            <TabsTrigger value="all">全部</TabsTrigger>
            {allTypes.map((t) => (
              <TabsTrigger key={t} value={t}>
                {typeLabels[t] ?? t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <Info className="size-5 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {activeType === "all" ? "暂无已安装插件" : `暂无${typeLabels[activeType] ?? activeType}类型的插件`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            可通过上传安装或从插件市场安装
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const authorHref = safeHref(p.author?.url)
            const homepageHref = safeHref(p.homepage)
            return (
            <div
              key={p.id}
              className="p-4 border rounded-md space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{p.name}</span>
                    {p.version && (
                      <span className="text-xs text-muted-foreground">v{p.version}</span>
                    )}
                    {p.type && (
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                        {typeLabels[p.type] ?? p.type}
                      </Badge>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {p.author?.name && (
                      <span>
                        作者:{" "}
                        {authorHref ? (
                          <a href={authorHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {p.author.name}
                          </a>
                        ) : (
                          p.author.name
                        )}
                      </span>
                    )}
                    {homepageHref && (
                      <a
                        href={homepageHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 hover:underline"
                      >
                        主页 <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  {p.error && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{p.error}</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={p.enabled ?? false}
                  onCheckedChange={() => handleToggle(p.id ?? "", p.enabled ?? false)}
                  disabled={!!p.error || (toggling[p.id ?? ""] ?? false)}
                  className="shrink-0"
                />
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleReload(p.id ?? "")}
                      disabled={reloading[p.id ?? ""]}
                    >
                      <RefreshCw className={`size-4 ${reloading[p.id ?? ""] ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>重载</TooltipContent>
                </Tooltip>
                {!p.error && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => { setConfigPlugin(p); setConfigOpen(true) }}
                      >
                        <Settings2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>配置</TooltipContent>
                  </Tooltip>
                )}
                {!p.error && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleExport(p.id ?? "")}
                      >
                        <PackageOpen className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>导出</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setUninstallTarget(p)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>卸载</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )})}
        </div>
      )}

      {configPlugin && (
        <PluginConfigSheet
          plugin={configPlugin}
          open={configOpen}
          onOpenChange={(open) => {
            setConfigOpen(open)
            if (!open) setTimeout(() => setConfigPlugin(null), 300)
          }}
        />
      )}

      <AlertDialog open={!!uninstallTarget} onOpenChange={(open) => !open && setUninstallTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>卸载插件</AlertDialogTitle>
            <AlertDialogDescription>
              确定要卸载「{uninstallTarget?.name}」吗？插件文件和配置将被永久删除。
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
  const [activeType, setActiveType] = useState("all")


  const loadMarketplace = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await getAdminPluginsMarketplace()
      if (res?.code === 0 && res.data) {
        setItems(res.data as MarketplaceItem[])
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "加载插件市场失败"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMarketplace() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadMarketplace])

  const filtered = useMemo(() => {
    if (activeType === "all") return items
    return items.filter((i) => i.type === activeType)
  }, [items, activeType])

  const handleInstall = async (item: MarketplaceItem) => {
    if (!item.id) return
    setInstalling((prev) => ({ ...prev, [item.id!]: true }))
    try {
      const { data: res } = await postAdminPluginsMarketplaceByIdInstall({
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

  return (
    <>
      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList className="max-w-full overflow-x-auto overflow-y-hidden no-scrollbar justify-start">
          <TabsTrigger value="all">全部</TabsTrigger>
          {allTypes.map((t) => (
            <TabsTrigger key={t} value={t}>
              {typeLabels[t] ?? t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <Store className="size-5 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {activeType === "all" ? "插件市场暂无可用插件" : `暂无${typeLabels[activeType] ?? activeType}类型的插件`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const hasUpdate = item.installed && item.installed_version !== item.version
            const itemAuthorHref = safeHref(item.author?.url)
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 p-4 border rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-xs text-muted-foreground">v{item.version}</span>
                    {item.type && (
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                        {typeLabels[item.type] ?? item.type}
                      </Badge>
                    )}
                    {item.installed && (
                      <Badge variant="outline" className="text-[11px] px-1.5 py-0">
                        已安装{item.installed_version ? ` v${item.installed_version}` : ""}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  )}
                  {item.author?.name && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      作者:{" "}
                      {itemAuthorHref ? (
                        <a href={itemAuthorHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {item.author.name}
                        </a>
                      ) : (
                        item.author.name
                      )}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {item.installed && !hasUpdate ? (
                    <Button variant="outline" disabled>
                      已安装
                    </Button>
                  ) : (
                    <Button
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
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function Plugins() {
  useBreadcrumb([{ label: "插件管理" }])

  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("installed")

  const loadPlugins = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await getAdminPlugins()
      if (res?.code === 0 && res.data) {
        setPlugins(res.data as PluginInfo[])
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "加载插件列表失败"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlugins() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadPlugins])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">插件管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理已安装的扩展插件，或从插件市场浏览安装
          </p>
        </div>
        <Button variant="outline" onClick={loadPlugins} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="installed">已安装</TabsTrigger>
          <TabsTrigger value="marketplace">
            <Store className="size-3.5" />
            插件市场
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "installed" ? (
        <InstalledPlugins
          plugins={plugins}
          loading={loading}
          onRefresh={loadPlugins}
          onPluginsChange={setPlugins}
        />
      ) : (
        <Marketplace onInstalled={loadPlugins} />
      )}
    </div>
  )
}
