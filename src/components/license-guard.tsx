import { useUnlicensed } from "@/hooks/use-license"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { ShieldX } from "lucide-react"

function UnlicensedScreen() {
  const { site_name: siteName } = useSiteSettings()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <ShieldX className="size-12 text-muted-foreground/50 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">程序未授权</h1>
        <p className="text-muted-foreground text-sm">
          {siteName} 尚未获得有效的授权许可，请联系管理员完成授权配置后重新启动服务。
        </p>
      </div>
    </div>
  )
}

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const unlicensed = useUnlicensed()
  if (unlicensed) return <UnlicensedScreen />
  return children
}
