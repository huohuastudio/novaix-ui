import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getOauthProviders, getOauthByNameAuthorize } from "@/api"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { getBrandMeta } from "@/lib/brand"
import { getErrorMessage } from "@/lib/utils"

interface ProviderInfo {
  name: string
  method?: string
  title: string
}

export function SocialLoginButtons() {
  const { oauth_providers } = useSiteSettings()
  const [providers, setProviders] = useState<ProviderInfo[]>([])

  useEffect(() => {
    if (!oauth_providers) return
    void (async () => {
      try {
        const { data: res } = await getOauthProviders()
        if (res?.code === 0 && res.data?.providers) {
          setProviders(res.data.providers as ProviderInfo[])
        }
      } catch { /* ignore */ }
    })()
  }, [oauth_providers])

  if (providers.length === 0) return null

  const handleClick = async (p: ProviderInfo): Promise<void> => {
    try {
      const query: Record<string, string> = { redirect: "/portal" }
      if (p.method) query.method = p.method
      const { data: res } = await getOauthByNameAuthorize({ path: { name: p.name }, query })
      if (res?.code === 0 && res.data?.url) {
        // eslint-disable-next-line react-hooks/immutability -- 浏览器导航，非 React 状态变更
        window.location.href = res.data.url
      } else if (res?.message) {
        toast.error(res.message)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "登录请求失败"))
    }
  }

  return (
    <>
      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
          或通过以下方式登录
        </span>
      </div>
      <TooltipProvider>
        <div className="flex items-center justify-center gap-2">
          {providers.map((p) => {
            const key = (p.method || p.name).toLowerCase()
            const meta = getBrandMeta(key)
            const Icon = meta?.icon
            return (
              <Tooltip key={p.method ? `${p.name}:${p.method}` : p.name}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
                    onClick={() => handleClick(p)}
                  >
                    {Icon ? (
                      <Icon size={18} color="currentColor" />
                    ) : (
                      <span className="text-sm font-medium">{p.title[0]}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{p.title}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </>
  )
}
