import { useEffect, useState } from "react"
import { Download, Gem, FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getPublicCmsBrandAssets } from "@/api"
import type { PublicPublicBrandAssetItem } from "@/api"
import { useSiteName } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"
import { formatBytes } from "@/lib/utils"

function isImage(url?: string): boolean {
  if (!url) return false
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i.test(url)
}

export default function BrandAssets() {
  const siteName = useSiteName()
  useDocumentTitle(`品牌素材 - ${siteName}`)

  const [assets, setAssets] = useState<PublicPublicBrandAssetItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCmsBrandAssets()
      .then(({ data: res }) => setAssets(res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-center">品牌素材</h1>
      <p className="mt-2 text-muted-foreground text-center">下载官方 Logo、图标等品牌资源</p>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <Skeleton className="aspect-[4/3]" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <Gem className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无品牌素材</h3>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="rounded-xl border bg-card overflow-hidden">
              {isImage(asset.file_url) ? (
                <div className="aspect-[4/3] bg-[repeating-conic-gradient(#80808015_0%_25%,transparent_0%_50%)] bg-[length:20px_20px] flex items-center justify-center p-6">
                  <img src={asset.file_url} alt={asset.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  <FileText className="size-12 text-muted-foreground/20" />
                </div>
              )}
              <div className="p-5">
                <h3 className="text-base font-semibold text-foreground">{asset.name}</h3>
                {asset.description && (
                  <p className="text-sm text-muted-foreground mt-1">{asset.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  {asset.file_size ? (
                    <span className="text-xs text-muted-foreground">{formatBytes(asset.file_size)}</span>
                  ) : (
                    <span />
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <a href={asset.file_url} download>
                      <Download className="size-3.5" />
                      下载
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
