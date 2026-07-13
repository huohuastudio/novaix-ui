import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAdminUsers } from "@/api"
import {
  getAdminSettingsByGroupOptions,
} from "@/api/@tanstack/react-query.gen"
import type { UserUserItem } from "@/api"
import { queryKeys } from "@/lib/query-keys"

const PAGE_SIZE = 100

async function fetchAllUsers(role: "admin" | "agent"): Promise<UserUserItem[]> {
  const all: UserUserItem[] = []
  let page = 1
  while (true) {
    const { data: res } = await getAdminUsers({ query: { role, page, page_size: PAGE_SIZE } })
    const items = res?.data?.items ?? []
    all.push(...items)
    if (all.length >= (res?.data?.total ?? 0) || items.length < PAGE_SIZE) break
    page++
  }
  return all
}

export function useTicketMeta() {
  // 部门列表来自 ticket 设置分组（加载失败保持空数组，与原「忽略错误」行为一致）
  const settingsQuery = useQuery(getAdminSettingsByGroupOptions({ path: { group: "ticket" } }))

  const departments = useMemo(() => {
    const d = (settingsQuery.data?.data as Record<string, string> | undefined)?.ticket_departments
    if (!d) return []
    try {
      const parsed = JSON.parse(d)
      if (Array.isArray(parsed)) return parsed as string[]
    } catch { /* ignore */ }
    return []
  }, [settingsQuery.data])

  // 工作人员列表聚合了 admin/agent 两个角色的全量分页数据（独立根 key，员工名录低频变化，适当延长 staleTime）
  const staffQuery = useQuery({
    queryKey: queryKeys.ticketStaff(),
    queryFn: async () => {
      const [admins, agents] = await Promise.all([fetchAllUsers("admin"), fetchAllUsers("agent")])
      return [...admins, ...agents]
    },
    staleTime: 5 * 60_000,
  })

  return { departments, staffUsers: staffQuery.data ?? [] }
}
