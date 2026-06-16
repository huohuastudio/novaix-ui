import { useSyncExternalStore } from "react"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { getUser } from "@/lib/auth"

let _active = false
let _message = ''
const _listeners: Set<() => void> = new Set()

function notify() {
  _listeners.forEach(cb => cb())
}

export function setMaintenanceState(active: boolean, message: string) {
  if (_active === active && _message === message) return
  _active = active
  _message = message
  notify()
}

function subscribe(cb: () => void) {
  _listeners.add(cb)
  return () => { _listeners.delete(cb) }
}

function getSnapshot() { return _active }
function getMessageSnapshot() { return _message }

export function useMaintenanceGuard() {
  const { maintenance_enabled, maintenance_message } = useSiteSettings()
  const apiActive = useSyncExternalStore(subscribe, getSnapshot)
  const apiMessage = useSyncExternalStore(subscribe, getMessageSnapshot)

  const active = maintenance_enabled === "true" || apiActive
  const message = apiMessage || maintenance_message
  const isAdmin = getUser()?.role === "admin"

  return { active: active && !isAdmin, message }
}
