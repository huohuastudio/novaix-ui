import { useEffect, useState } from "react"
import { Loader2, Trash2, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import {
  getPortalOauthAccounts,
  getPortalOauthAccountsByNameLink,
  deletePortalOauthAccountsById,
  getOauthProviders,
} from "@/api"

interface ProviderInfo {
  name: string
  method?: string
  title: string
}

interface OAuthAccount {
  id: number
  provider: string
  method?: string
  display_name: string
  email: string
  avatar_url: string
  linked_at: string
}

function providerKey(p: ProviderInfo): string {
  return p.method ? `${p.name}:${p.method}` : p.name
}

export function OAuthAccountsSection() {
  const { oauth_providers } = useSiteSettings()
  const [providerInfos, setProviderInfos] = useState<ProviderInfo[]>([])

  useEffect(() => {
    if (!oauth_providers) return
    void (async () => {
      try {
        const { data: res } = await getOauthProviders()
        if (res?.code === 0 && res.data?.providers) {
          setProviderInfos(res.data.providers as ProviderInfo[])
        }
      } catch { /* ignore */ }
    })()
  }, [oauth_providers])

  const providerTitleMap = new Map(providerInfos.map((p) => [providerKey(p), p.title]))
  const [accounts, setAccounts] = useState<OAuthAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [unlinkId, setUnlinkId] = useState<number | null>(null)
  const [unlinking, setUnlinking] = useState(false)

  const fetchAccounts = async () => {
    try {
      const { data: res } = await getPortalOauthAccounts()
      if (res?.code === 0 && res.data) {
        setAccounts(res.data as OAuthAccount[])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
  useEffect(() => { fetchAccounts() }, [])

  if (providerInfos.length === 0 && accounts.length === 0) return null

  const linkedProviders = new Set(accounts.map((a) => a.method ? `${a.provider}:${a.method}` : a.provider))
  const unlinkableProviders = providerInfos.filter((p) => !linkedProviders.has(providerKey(p)))

  const handleLink = async (p: ProviderInfo) => {
    try {
      const query: Record<string, string> = {}
      if (p.method) query.method = p.method
      const { data: res } = await getPortalOauthAccountsByNameLink({ path: { name: p.name }, query })
      if (res?.code === 0 && res.data?.url) {
        // eslint-disable-next-line react-hooks/immutability -- 浏览器导航，非 React 状态变更
        window.location.href = res.data.url
      } else {
        toast.error(res?.message ?? "获取授权链接失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  const handleUnlink = async () => {
    if (unlinkId == null) return
    setUnlinking(true)
    try {
      const { data: res } = await deletePortalOauthAccountsById({ path: { id: unlinkId } })
      if (res?.code === 0) {
        toast.success("已解除关联")
        setAccounts((prev) => prev.filter((a) => a.id !== unlinkId))
      } else {
        toast.error(res?.message ?? "解除关联失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    } finally {
      setUnlinking(false)
      setUnlinkId(null)
    }
  }

  return (
    <>
      <div>
        <h3 className="text-sm font-medium">社交账号</h3>
        <p className="text-xs text-muted-foreground mt-1">关联第三方账号，一键登录无需输入密码</p>
      </div>
      <div className="mt-4 space-y-2 max-w-2xl">
        {loading ? (
          <div className="h-12 rounded-md border animate-pulse bg-muted" />
        ) : (
          <>
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                <div className="flex items-center gap-3">
                  {acc.avatar_url ? (
                    <img src={acc.avatar_url} alt="" className="size-8 rounded-full" />
                  ) : (
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(acc.display_name || acc.provider)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{providerTitleMap.get(acc.method ? `${acc.provider}:${acc.method}` : acc.provider) ?? acc.provider}</p>
                    <p className="text-xs text-muted-foreground">{acc.display_name || acc.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setUnlinkId(acc.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {unlinkableProviders.map((p) => (
              <Button key={providerKey(p)} variant="outline" className="w-full justify-start gap-2" onClick={() => handleLink(p)}>
                <LinkIcon className="size-4" />
                关联 {p.title}
              </Button>
            ))}
          </>
        )}
      </div>

      <AlertDialog open={unlinkId != null} onOpenChange={(open) => !open && setUnlinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>解除关联</AlertDialogTitle>
            <AlertDialogDescription>确定要解除该社交账号的关联吗？解除后将无法使用该账号快捷登录。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} disabled={unlinking}>
              {unlinking && <Loader2 className="size-4 animate-spin" />}
              确认解除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
