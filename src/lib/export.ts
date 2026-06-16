import { toast } from 'sonner'
import { isImpersonating } from '@/lib/auth'

export type ExportFormat = 'csv' | 'xlsx'

export async function downloadExport(endpoint: string, format: ExportFormat = 'csv', params?: Record<string, string>) {
  const url = new URL(`/api/v1/admin/export/${endpoint}`, window.location.origin)
  url.searchParams.set('format', format)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v)
    }
  }

  const token = isImpersonating()
    ? sessionStorage.getItem('token')
    : localStorage.getItem('token')

  try {
    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.ok) {
      toast.error('导出失败')
      return
    }

    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') ?? ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    const filename = match?.[1] ?? `${endpoint}.${format}`

    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    toast.error('导出失败')
  }
}