import { useEffect, useState } from "react"
import { HelpCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { FaqItem } from "@/components/faq-item"
import { getPublicCmsFaqs } from "@/api"
import type { PublicPublicFaqItem } from "@/api"
import { useSiteName } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"

interface FaqGroup {
  name: string
  items: PublicPublicFaqItem[]
}

function groupFaqs(faqs: PublicPublicFaqItem[]): FaqGroup[] {
  const map = new Map<string, PublicPublicFaqItem[]>()
  for (const faq of faqs) {
    const group = faq.group_name || ""
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(faq)
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
}

export default function FAQ() {
  const siteName = useSiteName()
  useDocumentTitle(`常见问题 - ${siteName}`)

  const [faqs, setFaqs] = useState<PublicPublicFaqItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCmsFaqs()
      .then(({ data: res }) => setFaqs(res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const groups = groupFaqs(faqs)

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-center">常见问题</h1>
      <p className="mt-2 text-muted-foreground text-center">关于产品和服务的常见问题解答</p>

      {loading ? (
        <div className="mt-10 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border/50 py-5">
              <Skeleton className="h-5 w-3/4" />
            </div>
          ))}
        </div>
      ) : faqs.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <HelpCircle className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无常见问题</h3>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <div key={group.name}>
              {group.name && <h2 className="text-lg font-semibold mb-2">{group.name}</h2>}
              <div>
                {group.items.map((f) => (
                  <FaqItem key={f.id} q={f.question ?? ""} a={f.answer ?? ""} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
