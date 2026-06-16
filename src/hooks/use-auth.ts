import { getUser } from "@/lib/auth"

export function useIsAdmin() {
  return getUser()?.role === "admin"
}
