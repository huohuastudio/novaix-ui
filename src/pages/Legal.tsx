import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { getSettingsLegal } from "@/api"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { sanitizeHtml } from "@/lib/sanitize"

const config = {
  tos: { title: "服务条款", urlKey: "tos_url", contentKey: "tos_content" },
  privacy: { title: "隐私政策", urlKey: "privacy_url", contentKey: "privacy_content" },
} as const

export default function Legal() {
  const { type } = useParams<{ type: "tos" | "privacy" }>()
  const settings = useSiteSettings()
  const cfg = config[type as keyof typeof config]
  const url = cfg ? (settings[cfg.urlKey as keyof typeof settings] as string) : ""

  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)

  useDocumentTitle(`${cfg?.title ?? ""} - ${settings.site_name}`)

  useEffect(() => {
    if (url) {
      window.location.href = url
      return
    }
    if (!cfg) return
    getSettingsLegal()
      .then(({ data: res }) => {
        if (res?.code === 0 && res.data) {
          setContent((res.data as Record<string, string>)[cfg.contentKey] ?? "")
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [url, cfg])

  if (!cfg || url) return null

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link to="/">
          <ArrowLeft className="size-4" />
          返回首页
        </Link>
      </Button>
      <h1 className="text-2xl font-bold mb-6">{cfg.title}</h1>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : content ? (
        <div
          className="markdown-body text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      ) : (
        <p className="text-muted-foreground">暂无内容</p>
      )}
    </div>
  )
}
