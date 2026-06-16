export const ticketStatusConfig: Record<string, { label: string; dot: string; text: string }> = {
  open: { label: '待回复', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  replied: { label: '已回复', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  user_reply: { label: '用户回复', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  closed: { label: '已关闭', dot: 'bg-zinc-300 dark:bg-zinc-600', text: 'text-zinc-400 dark:text-zinc-500' },
}

export const priorityLabels: Record<number, string> = {
  0: '低',
  1: '中',
  2: '高',
}

// SLA 状态判定
export type SLAStatus = 'normal' | 'approaching' | 'breached'

/**
 * 根据 SLA 截止时间判定当前状态
 * - breached: 已超时
 * - approaching: 1 小时内即将到期
 * - normal: 正常
 */
export function getSLAStatus(slaDeadline: string | undefined): SLAStatus {
  if (!slaDeadline) return 'normal'
  const deadline = new Date(slaDeadline).getTime()
  const now = Date.now()
  if (now >= deadline) return 'breached'
  if (deadline - now <= 60 * 60 * 1000) return 'approaching'
  return 'normal'
}

export const slaStatusConfig: Record<SLAStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  normal: { label: '正常', variant: 'outline' },
  approaching: { label: '临近', variant: 'secondary' },
  breached: { label: '超时', variant: 'destructive' },
}

/**
 * 格式化 SLA 剩余时间
 */
export function formatSLARemaining(slaDeadline: string | undefined): string {
  if (!slaDeadline) return '-'
  const deadline = new Date(slaDeadline).getTime()
  const now = Date.now()
  const diff = deadline - now
  if (diff <= 0) return '已超时'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}
