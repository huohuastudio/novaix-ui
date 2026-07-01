import { useEffect, useState } from "react"
import { MapPin } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/copy-button"
import { getPublicCmsDataCenters } from "@/api"
import type { PublicPublicDataCenterItem } from "@/api"
import { useSiteName } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"

export default function DataCenters() {
  const siteName = useSiteName()
  useDocumentTitle(`数据中心 - ${siteName}`)

  const [dataCenters, setDataCenters] = useState<PublicPublicDataCenterItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCmsDataCenters()
      .then(({ data: res }) => setDataCenters(res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-center">数据中心</h1>
      <p className="mt-2 text-muted-foreground text-center">全球多地域部署，为您提供低延迟、高可用的云服务</p>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <Skeleton className="aspect-[16/9]" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : dataCenters.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <MapPin className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无数据中心信息</h3>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataCenters.map((dc) => (
            <div key={dc.id} className="rounded-xl border bg-card overflow-hidden">
              {dc.image ? (
                <div className="aspect-[16/9] bg-muted">
                  <img src={dc.image} alt={dc.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                  <MapPin className="size-8 text-muted-foreground/20" />
                </div>
              )}
              <div className="p-5">
                <h3 className="text-base font-semibold text-foreground">{dc.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{[dc.city, dc.country].filter(Boolean).join(", ")}</p>
                {dc.description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{dc.description}</p>
                )}
                {(dc.features?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {dc.features!.map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                )}
                {dc.test_ip && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground font-mono">测试 IP: {dc.test_ip}</span>
                    <CopyButton value={dc.test_ip} className="size-5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
