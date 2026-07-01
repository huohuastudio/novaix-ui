import { useEffect, useState } from "react"
import { Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getPublicCmsTeamMembers } from "@/api"
import type { PublicPublicTeamMemberItem } from "@/api"
import { useSiteName } from "@/hooks/use-site-settings"
import { useDocumentTitle } from "@uidotdev/usehooks"

export default function Team() {
  const siteName = useSiteName()
  useDocumentTitle(`团队成员 - ${siteName}`)

  const [members, setMembers] = useState<PublicPublicTeamMemberItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCmsTeamMembers()
      .then(({ data: res }) => setMembers(res?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-center">我们的团队</h1>
      <p className="mt-2 text-muted-foreground text-center">认识我们背后的人</p>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 text-center space-y-3">
              <Skeleton className="size-20 rounded-full mx-auto" />
              <Skeleton className="h-5 w-24 mx-auto" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <Users className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无团队成员信息</h3>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.map((m) => (
            <div key={m.id} className="rounded-xl border bg-card p-6 text-center">
              {m.avatar ? (
                <img src={m.avatar} alt={m.name} className="size-20 rounded-full object-cover mx-auto" />
              ) : (
                <div className="size-20 rounded-full bg-muted flex items-center justify-center mx-auto text-2xl font-medium text-muted-foreground">
                  {m.name?.charAt(0)}
                </div>
              )}
              <h3 className="mt-4 text-base font-semibold text-foreground">{m.name}</h3>
              {m.position && <p className="mt-1 text-sm text-primary">{m.position}</p>}
              {m.bio && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
