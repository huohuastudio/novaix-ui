import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Lock, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  getAdminTicketsById,
  putAdminTicketsById,
  postAdminTicketsByIdReply,
} from "@/api"
import type { TicketTicketDetailResponse, TicketReplyItem } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/rich-text-editor"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { useTicketMeta } from "@/hooks/use-ticket-meta"
import { getSLAStatus, slaStatusConfig, formatSLARemaining } from "@/lib/ticket-constants"
import { statusMap, priorityMap } from "./constants"
import { sanitizeHtml } from "@/lib/sanitize"
import { getErrorMessage } from "@/lib/utils"

function DetailSkeleton() {
  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

function ReplyBubble({ reply, formatDate }: { reply: TicketReplyItem; formatDate: (s?: string) => string }) {
  const isStaff = reply.role === "admin" || reply.role === "agent"

  return (
    <div className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-3 ${
          reply.is_internal
            ? "border-2 border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
            : isStaff
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
        }`}
      >
        <div className={`flex items-center gap-2 mb-1 text-xs ${
          reply.is_internal
            ? "text-amber-700 dark:text-amber-400"
            : isStaff
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
        }`}>
          <span className="font-medium">{reply.username}</span>
          {reply.is_internal && (
            <span className="inline-flex items-center gap-0.5">
              <Lock className="size-3" />
              内部备注
            </span>
          )}
          <span>{formatDate(reply.created_at)}</span>
        </div>
        <div
          className="markdown-body text-sm"
          style={isStaff && !reply.is_internal ? {
            "--fgColor-default": "var(--primary-foreground)",
            "--fgColor-muted": "var(--primary-foreground)",
            color: "var(--primary-foreground)",
          } as React.CSSProperties : undefined}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(reply.content ?? "") }}
        />
      </div>
    </div>
  )
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const adminPath = useAdminPath()
  const formatDate = useFormatDate()
  const [ticket, setTicket] = useState<TicketTicketDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const { departments, staffUsers } = useTicketMeta()

  useBreadcrumb([
    { label: "工单管理", href: `${adminPath}/tickets` },
    { label: ticket ? `#${ticket.id} ${ticket.subject}` : "详情" },
  ])

  const fetchTicket = useCallback(async () => {
    if (!id) return
    try {
      const { data: res } = await getAdminTicketsById({ path: { id: Number(id) } })
      if (res?.data) setTicket(res.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  useEffect(() => {
    if (!loading && ticket) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, ticket?.replies?.length])

  const handleStatusChange = useCallback(async (status: string) => {
    if (!ticket) return
    try {
      await putAdminTicketsById({ path: { id: ticket.id! }, body: { status } })
      setTicket(prev => prev ? { ...prev, status } : prev)
      toast.success("状态已更新")
    } catch (err) {
      toast.error(getErrorMessage(err, "更新失败"))
    }
  }, [ticket])

  const handlePriorityChange = useCallback(async (priority: string) => {
    if (!ticket) return
    try {
      await putAdminTicketsById({ path: { id: ticket.id! }, body: { priority: Number(priority) } })
      setTicket(prev => prev ? { ...prev, priority: Number(priority) } : prev)
      toast.success("优先级已更新")
    } catch (err) {
      toast.error(getErrorMessage(err, "更新失败"))
    }
  }, [ticket])

  const handleDepartmentChange = useCallback(async (department: string) => {
    if (!ticket) return
    const value = department === "__none__" ? "" : department
    try {
      await putAdminTicketsById({ path: { id: ticket.id! }, body: { department: value } })
      setTicket(prev => prev ? { ...prev, department: value } : prev)
      toast.success("部门已更新")
    } catch (err) {
      toast.error(getErrorMessage(err, "更新失败"))
    }
  }, [ticket])

  const handleAssigneeChange = useCallback(async (assigneeId: string) => {
    if (!ticket) return
    const id = assigneeId === "__none__" ? 0 : Number(assigneeId)
    try {
      await putAdminTicketsById({ path: { id: ticket.id! }, body: { assignee_id: id } })
      const user = staffUsers.find(u => u.id === id)
      setTicket(prev => prev ? { ...prev, assignee_id: id, assignee_name: user?.username ?? "" } : prev)
      toast.success("指派人已更新")
    } catch (err) {
      toast.error(getErrorMessage(err, "更新失败"))
    }
  }, [ticket, staffUsers])

  const handleReply = useCallback(async () => {
    if (!ticket || !replyContent.trim() || replyContent === "<p></p>") {
      toast.error("请输入回复内容")
      return
    }
    setSubmitting(true)
    try {
      const { data: res } = await postAdminTicketsByIdReply({
        path: { id: ticket.id! },
        body: { content: replyContent, is_internal: isInternal },
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "回复失败")
        return
      }
      setReplyContent("")
      setIsInternal(false)
      fetchTicket()
    } catch (err) {
      toast.error(getErrorMessage(err, "回复失败"))
    } finally {
      setSubmitting(false)
    }
  }, [ticket, replyContent, isInternal, fetchTicket])

  if (loading) return <DetailSkeleton />

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-muted-foreground">工单不存在</p>
        <Button variant="outline" onClick={() => navigate(`${adminPath}/tickets`)}>返回列表</Button>
      </div>
    )
  }

  const status = statusMap[ticket.status ?? ""]
  const priority = priorityMap[ticket.priority ?? 0]
  const isClosed = ticket.status === "closed"

  return (
    <div className="px-6 pt-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`${adminPath}/tickets`)}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">{ticket.subject}</h1>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
          {priority && <Badge variant={priority.variant}>{priority.label}</Badge>}
        </div>
      </div>

      {/* 工单信息 + 操作 */}
      <section className="shrink-0">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
          <KV label="工单编号">#{ticket.id}</KV>
          <KV label="提交用户">{ticket.username}</KV>
          <KV label="创建时间">{formatDate(ticket.created_at)}</KV>
          <KV label="状态">
            <Select value={ticket.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">待处理</SelectItem>
                <SelectItem value="replied">已回复</SelectItem>
                <SelectItem value="user_reply">用户回复</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>
          </KV>
          <KV label="优先级">
            <Select value={String(ticket.priority ?? 0)} onValueChange={handlePriorityChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">低</SelectItem>
                <SelectItem value="1">中</SelectItem>
                <SelectItem value="2">高</SelectItem>
              </SelectContent>
            </Select>
          </KV>
          {departments.length > 0 && (
            <KV label="部门">
              <Select value={ticket.department || "__none__"} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未分配</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </KV>
          )}
          <KV label="指派人">
            <Select value={String(ticket.assignee_id || "__none__")} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">未指派</SelectItem>
                {staffUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </KV>
          {ticket.sla_deadline && (() => {
            const slaStatus = getSLAStatus(ticket.sla_deadline)
            const slaCfg = slaStatusConfig[slaStatus]
            return (
              <KV label="SLA 时限">
                <div className="flex items-center gap-2">
                  <Badge variant={slaCfg.variant}>{slaCfg.label}</Badge>
                  <span className="text-xs text-muted-foreground">{formatSLARemaining(ticket.sla_deadline)}</span>
                </div>
              </KV>
            )
          })()}
          {ticket.first_response_at && (
            <KV label="首次响应">{formatDate(ticket.first_response_at)}</KV>
          )}
          {ticket.closed_at && (
            <KV label="关闭时间">{formatDate(ticket.closed_at)}</KV>
          )}
        </dl>
      </section>

      <Separator className="shrink-0" />

      {/* 对话线程 */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">对话记录</h3>
        {(!ticket.replies || ticket.replies.length === 0) ? (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无回复</p>
        ) : (
          <div className="space-y-3">
            {ticket.replies.map((reply) => (
              <ReplyBubble key={reply.id} reply={reply} formatDate={formatDate} />
            ))}
          </div>
        )}
        <div ref={threadEndRef} />
      </section>

      {/* 回复框 */}
      {!isClosed && (
        <>
          <Separator className="shrink-0" />
          <section className="shrink-0 space-y-3">
            <h3 className="text-sm font-medium">回复工单</h3>
            <RichTextEditor value={replyContent} onChange={setReplyContent} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="internal" checked={isInternal} onCheckedChange={setIsInternal} />
                <Label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
                  内部备注（用户不可见）
                </Label>
              </div>
              <Button onClick={handleReply} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {submitting ? "发送中..." : "发送回复"}
              </Button>
            </div>
          </section>
        </>
      )}

      {isClosed && (
        <div className="shrink-0 text-center py-4 text-sm text-muted-foreground border rounded-md bg-muted/50">
          该工单已关闭，如需继续沟通请重新打开工单
        </div>
      )}
    </div>
  )
}
