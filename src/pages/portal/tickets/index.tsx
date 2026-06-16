import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/rich-text-editor'
import {
  getPortalTickets,
  postPortalTickets,
} from '@/api'
import type { PortalPortalTicketItem } from '@/api'
import { SimplePagination } from '@/components/simple-pagination'
import { useSiteName, useFormatDate, useSiteSettings } from '@/hooks/use-site-settings'
import { getErrorMessage, isHtmlEmpty } from '@/lib/utils'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { ticketStatusConfig, priorityLabels } from '@/lib/ticket-constants'

const statusFilterOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'open', label: '待回复' },
  { value: 'replied', label: '已回复' },
  { value: 'user_reply', label: '用户回复' },
  { value: 'closed', label: '已关闭' },
]

function TicketStatus({ status }: { status: string }) {
  const cfg = ticketStatusConfig[status] ?? { label: status, dot: 'bg-zinc-400', text: 'text-zinc-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export default function PortalTickets() {
  const siteName = useSiteName()
  const formatDate = useFormatDate()
  const siteSettings = useSiteSettings()
  useDocumentTitle(`工单 - ${siteName}`)

  // 解析部门列表
  let departments: string[] = []
  try {
    const parsed = JSON.parse(siteSettings.ticket_departments || '[]')
    if (Array.isArray(parsed)) departments = parsed
  } catch { /* 忽略 */ }
  const hasDepartments = departments.length > 0

  const [tickets, setTickets] = useState<PortalPortalTicketItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTicket, setNewTicket] = useState({ subject: '', content: '', priority: 1, department: '' })

  const fetchTickets = useCallback(async (status: string, p: number) => {
    try {
      const { data: res } = await getPortalTickets({
        query: {
          page: p,
          page_size: pageSize,
          status: status === 'all' ? undefined : status as 'open' | 'replied' | 'user_reply' | 'closed',
          sort: 'last_reply_at',
          order: 'desc',
        },
      })
      setTickets(res?.data?.items ?? [])
      setTotal(res?.data?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 筛选条件变化时重置页码
    setPage(1)
  }, [statusFilter])

  useEffect(() => {
    fetchTickets(statusFilter, page)
  }, [fetchTickets, statusFilter, page])

  const handleCreate = async () => {
    if (!newTicket.subject.trim() || isHtmlEmpty(newTicket.content)) {
      toast.error('请填写主题和内容')
      return
    }
    setCreating(true)
    try {
      await postPortalTickets({
        body: {
          subject: newTicket.subject,
          content: newTicket.content,
          priority: newTicket.priority,
          department: newTicket.department || undefined,
        },
      })
      toast.success('工单已提交')
      setCreateOpen(false)
      setNewTicket({ subject: '', content: '', priority: 1, department: '' })
      fetchTickets(statusFilter, page)
    } catch (err) {
      toast.error(getErrorMessage(err, '提交失败'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">工单</h1>
          <p className="mt-1 text-sm text-muted-foreground">提交工单获取技术支持</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="shadow-sm ring-0">
              {statusFilterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            提交工单
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <MessageSquare className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无工单</h3>
          <p className="text-sm text-muted-foreground mt-1">遇到问题？提交工单获取帮助</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-background divide-y divide-border/50 overflow-hidden">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/portal/tickets/${ticket.id}`}
                className="block p-5 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium truncate">{ticket.subject}</span>
                      <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
                        {priorityLabels[ticket.priority ?? 1] ?? '中'}优先级
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>#{ticket.id}</span>
                      {hasDepartments && ticket.department && (
                        <span className="bg-muted/60 px-1.5 py-0.5 rounded">{ticket.department}</span>
                      )}
                      <span>{formatDate(ticket.created_at ?? '')}</span>
                      {ticket.reply_count !== undefined && ticket.reply_count > 0 && (
                        <span>{ticket.reply_count} 条回复</span>
                      )}
                    </div>
                  </div>
                  <TicketStatus status={ticket.status ?? 'open'} />
                </div>
              </Link>
            ))}
          </div>
          <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}

      {/* 创建工单 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>提交工单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className={`grid gap-4 ${hasDepartments ? 'sm:grid-cols-[1fr_auto_auto]' : 'sm:grid-cols-[1fr_auto]'}`}>
              <div className="space-y-2">
                <Label>主题</Label>
                <Input
                  placeholder="简要描述您的问题"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              {hasDepartments && (
                <div className="space-y-2">
                  <Label>部门</Label>
                  <Select
                    value={newTicket.department || "__none__"}
                    onValueChange={(v) => setNewTicket({ ...newTicket, department: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="shadow-sm ring-0">
                      <SelectItem value="__none__">请选择</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select
                  value={String(newTicket.priority)}
                  onValueChange={(v) => setNewTicket({ ...newTicket, priority: Number(v) })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="shadow-sm ring-0">
                    <SelectItem value="0">低</SelectItem>
                    <SelectItem value="1">中</SelectItem>
                    <SelectItem value="2">高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>详细描述</Label>
              <RichTextEditor
                value={newTicket.content}
                onChange={(v) => setNewTicket({ ...newTicket, content: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="size-4 animate-spin" />}
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
