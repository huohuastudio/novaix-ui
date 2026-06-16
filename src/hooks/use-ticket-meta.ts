import { useEffect, useState } from "react"
import { getAdminSettingsByGroup, getAdminUsers } from "@/api"
import type { UserUserItem } from "@/api"

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
  const [departments, setDepartments] = useState<string[]>([])
  const [staffUsers, setStaffUsers] = useState<UserUserItem[]>([])

  useEffect(() => {
    getAdminSettingsByGroup({ path: { group: "ticket" } }).then(({ data: res }) => {
      if (res?.code === 0 && res.data) {
        try {
          const d = (res.data as Record<string, string>).ticket_departments
          const parsed = JSON.parse(d || "[]")
          if (Array.isArray(parsed)) setDepartments(parsed)
        } catch { /* ignore */ }
      }
    })
    Promise.all([fetchAllUsers("admin"), fetchAllUsers("agent")]).then(([admins, agents]) => {
      setStaffUsers([...admins, ...agents])
    })
  }, [])

  return { departments, staffUsers }
}
