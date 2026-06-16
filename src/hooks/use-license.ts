import { useSyncExternalStore } from "react"

let _unlicensed = false
const _listeners: Set<() => void> = new Set()

function notify() {
  _listeners.forEach(cb => cb())
}

export function setUnlicensed() {
  if (_unlicensed) return
  _unlicensed = true
  notify()
}

function subscribe(cb: () => void) {
  _listeners.add(cb)
  return () => { _listeners.delete(cb) }
}

function getSnapshot() { return _unlicensed }

export function useUnlicensed() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
