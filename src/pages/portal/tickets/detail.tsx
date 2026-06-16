import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RichTextEditor } from '@/components/rich-text-editor'
import {
  getPortalTicketsById,
  postPortalTicketsByIdReply,
} from '@/api'
import type { PortalPortalTicketDetailResponse } from '@/api'
import { useSiteName, useFormatDate } from '@/hooks/use-site-settings'
import { getErrorMessage, isHtmlEmpty } from '@/lib/utils'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { ticketStatusConfig, priorityLabels } from '@/lib/ticket-constants'
import { sanitizeHtml } from '@/lib/sanitize'

function TicketStatus({ status }: { status: string }) {
  const cfg = ticketStatusConfig[status] ?? { label: status, dot: 'bg-zinc-400', text: 'text-zinc-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`rounded-2xl p-4 ${i % 2 === 0 ? 'mr-8 bg-muted/50' : 'ml-8 bg-primary/5'}`}>
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PortalTicketDetail() {
  const siteName = useSiteName()
  const formatDate = useFormatDate()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<PortalPortalTicketDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)

  useDocumentTitle(`${detail?.subject ?? '工单详情'} - ${siteName}`)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const { data: res } = await getPortalTicketsById({ path: { id: Number(id) } })
      if (res?.code === 0 && res.data) {
        setDetail(res.data)
      } else {
        navigate('/portal/tickets', { replace: true })
      }
    } catch {
      navigate('/portal/tickets', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    fetchDetail()
  }, [fetchDetail])

  const handleReply = async () => {
    if (isHtmlEmpty(replyContent) || !detail?.id) return
    setReplying(true)
    try {
      await postPortalTicketsByIdReply({
        path: { id: detail.id },
        body: { content: replyContent },
      })
      toast.success('回复成功')
      setReplyContent('')
      fetchDetail()
    } catch (err) {
      toast.error(getErrorMessage(err, '回复失败'))
    } finally {
      setReplying(false)
    }
  }

  if (loading) return <DetailSkeleton />
  if (!detail) return null

  const status = detail.status ?? 'open'

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
          <Link to="/portal/tickets">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">{detail.subject}</h1>
            <TicketStatus status={status} />
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            #{detail.id}
            {detail.department && <> · {detail.department}</>}
            {' · '}{formatDate(detail.created_at ?? '')} · {priorityLabels[detail.priority ?? 1]}优先级
          </p>
        </div>
      </div>

      {/* 回复列表 */}
      <div className="space-y-3">
        {detail.replies?.map((reply) => {
          const isUser = reply.role === 'user'
          return (
            <div
              key={reply.id}
              className={`rounded-2xl p-5 ${isUser ? 'bg-primary/5 ml-8' : 'bg-background mr-8'}`}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-medium">
                  {isUser ? '我' : '客服'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(reply.created_at ?? '')}
                </span>
              </div>
              <div
                className="text-sm markdown-body [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(reply.content ?? '') }}
              />
            </div>
          )
        })}
      </div>

      {/* 回复输入 */}
      {status !== 'closed' && (
        <div className="rounded-2xl bg-background p-5">
          <RichTextEditor
            value={replyContent}
            onChange={setReplyContent}
            className="mb-3"
          />
          <div className="flex justify-end">
            <Button
              disabled={replying || isHtmlEmpty(replyContent)}
              onClick={handleReply}
            >
              {replying ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              发送回复
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
