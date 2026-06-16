import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response
    if (resp?.data?.message) return resp.data.message
  }
  return fallback
}

export function isHtmlEmpty(html: string): boolean {
  const text = html.replace(/<[^>]*>/g, '').trim()
  return text.length === 0
}

export function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
  return `${mb} MB`
}

export function formatDisk(gb: number): string {
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb} GB`
}

export function parseJSON<T>(json: string | undefined, fallback: T): T {
  try { return json ? JSON.parse(json) as T : fallback } catch { return fallback }
}

export function updateAt<T>(arr: T[], index: number, patch: Partial<T>): T[] {
  return arr.map((item, i) => i === index ? { ...item, ...patch } : item)
}

export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return "-"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const ALPHA_NUM_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const NUM_CHARS = '0123456789'

export function generateHostname(prefix: string, suffixType: string, suffixLength: number): string {
  const chars = suffixType === 'random_num' ? NUM_CHARS : ALPHA_NUM_CHARS
  const arr = new Uint32Array(suffixLength)
  crypto.getRandomValues(arr)
  const suffix = Array.from(arr, (v) => chars[v % chars.length]).join('')
  return prefix ? `${prefix}${suffix}` : suffix
}

export function generatePassword(length: number): string {
  const safeLen = Math.max(length, 8)
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const symbols = '!@#$%&*-_'
  const all = lower + upper + digits + symbols
  const required = [lower, upper, digits, symbols]
  // 单次分配：safeLen(填充) + 4(必选字符) + safeLen(洗牌)
  const buf = new Uint32Array(safeLen + 4 + safeLen)
  crypto.getRandomValues(buf)
  let ri = 0
  const pwd = Array.from({ length: safeLen }, () => all[buf[ri++] % all.length])
  for (let i = 0; i < required.length; i++) {
    pwd[i] = required[i][buf[ri++] % required[i].length]
  }
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = buf[ri++] % (i + 1)
    ;[pwd[i], pwd[j]] = [pwd[j], pwd[i]]
  }
  return pwd.join('')
}
