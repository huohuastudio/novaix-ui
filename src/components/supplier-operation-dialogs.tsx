import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { postAdminSupplierOperationsByIdResolve } from "@/api"
import type { ServiceAdminServiceOperation } from "@/api"
import {
  getAdminSupplierOperationsAttentionQueryKey,
  getAdminSupplierOperationsByIdOptions,
  getAdminSupplierOperationsByIdQueryKey,
  getAdminSupplierOperationsQueryKey,
  getAdminSupplierServicesByIdQueryKey,
  getAdminSupplierServicesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CopyButton } from "@/components/copy-button"
import { ModuleOpStatusBadge } from "@/components/supplier-badges"
import { useFormatDate, useTimezone } from "@/hooks/use-site-settings"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"
import {
  datetimeLocalToISO,
  moduleOpRequesterMap,
  moduleOpTypeMap,
  prettyJSON,
} from "@/lib/supplier-constants"
import { getErrorMessage } from "@/lib/utils"

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-all">{children}</dd>
    </div>
  )
}

/** 等宽、可滚动、可复制的文本块（日志 / 结果） */
function CodeBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {text && <CopyButton value={text} className="size-7" />}
      </div>
      {text ? (
        <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          {text}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">暂无内容</p>
      )}
    </div>
  )
}

/** 操作日志对话框：查看操作详情、脱敏后的上游调用日志与结果 */
export function OperationLogDialog({
  operationId,
  onOpenChange,
}: {
  operationId: number | null
  onOpenChange: (open: boolean) => void
}) {
  const formatDate = useFormatDate()
  // 关闭动画期间保留上一次的操作 ID，避免内容闪回加载态
  const [shownId, setShownId] = useState(operationId)
  if (operationId != null && operationId !== shownId) setShownId(operationId)
  const currentId = operationId ?? shownId
  const query = useQuery({
    ...getAdminSupplierOperationsByIdOptions({ path: { id: currentId ?? 0 } }),
    enabled: currentId != null,
  })
  useQueryErrorToast(query.error, "加载操作详情失败")
  const op = query.data?.data

  return (
    <Dialog open={operationId != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>操作 #{currentId}</DialogTitle>
          <DialogDescription>上游调用日志已脱敏，可复制后用于排查</DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : op ? (
          <div className="space-y-5 min-w-0">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
              <KV label="类型">{moduleOpTypeMap[op.type ?? ""] ?? op.type}</KV>
              <KV label="动作">{op.action || "-"}</KV>
              <KV label="状态"><ModuleOpStatusBadge status={op.status} /></KV>
              <KV label="尝试次数">{op.attempt ?? 0}</KV>
              <KV label="发起方">{moduleOpRequesterMap[op.requested_by ?? ""] ?? (op.requested_by || "-")}</KV>
              <KV label="服务 ID">{op.module_service_id ? `#${op.module_service_id}` : "-"}</KV>
              <KV label="远端引用"><span className="font-mono text-xs">{op.remote_ref || "-"}</span></KV>
              <KV label="幂等键"><span className="font-mono text-xs">{op.op_key || "-"}</span></KV>
              <KV label="创建时间">{formatDate(op.created_at)}</KV>
              <KV label="开始时间">{formatDate(op.started_at)}</KV>
              <KV label="完成时间">{formatDate(op.finished_at)}</KV>
              <KV label="下次执行">{formatDate(op.next_run_at)}</KV>
              {(op.resolution || op.resolved_by) && (
                <KV label="人工处理">{[op.resolution, op.resolved_by].filter(Boolean).join(" · ")}</KV>
              )}
            </dl>
            {(op.error_code || op.error_message) && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription className="break-all">
                  {op.error_code && <span className="font-mono">[{op.error_code}] </span>}
                  {op.error_message}
                </AlertDescription>
              </Alert>
            )}
            <CodeBlock title="执行日志" text={op.log ?? ""} />
            <CodeBlock title="执行结果" text={prettyJSON(op.result)} />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">操作不存在或已被清理</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

type ResolveAction = "retry" | "mark_succeeded" | "mark_failed"

const RESOLVE_ACTIONS: { value: ResolveAction; label: string; description: string }[] = [
  { value: "retry", label: "重试", description: "沿用同一幂等键重新调用上游，适用于确认上游未执行或可安全重放的情况" },
  { value: "mark_succeeded", label: "标记成功", description: "已在上游核对确认执行成功，可补录远端 ID 与上游到期时间" },
  { value: "mark_failed", label: "标记失败", description: "已在上游核对确认未执行，按失败处理；开通或续费失败的订单可在「订单管理」中退款" },
]

/** 人工处理对话框：重试 / 标记成功 / 标记失败；对账差异只提供“标记已处理” */
export function OperationResolveDialog({
  operation,
  onOpenChange,
  onSuccess,
}: {
  operation: ServiceAdminServiceOperation | null
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const queryClient = useQueryClient()
  const tz = useTimezone()
  // 关闭动画期间保留上一次的操作内容
  const [shown, setShown] = useState(operation)
  if (operation && operation !== shown) setShown(operation)
  const current = operation ?? shown
  const isReconcile = current?.type === "reconcile"
  const [action, setAction] = useState<ResolveAction>("retry")
  const [remoteId, setRemoteId] = useState("")
  const [expireAt, setExpireAt] = useState("")
  const [remark, setRemark] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (operation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时重置处理选项
      setAction(operation.type === "reconcile" ? "mark_succeeded" : "retry")
      setRemoteId("")
      setExpireAt("")
      setRemark("")
    }
  }, [operation])

  const handleSubmit = async () => {
    if (!operation?.id) return
    if (remark.length > 200) {
      toast.error("备注不能超过 200 个字符")
      return
    }
    setSubmitting(true)
    try {
      const withExtra = action === "mark_succeeded" && !isReconcile
      const { data: res } = await postAdminSupplierOperationsByIdResolve({
        path: { id: operation.id },
        body: {
          action,
          remote_id: withExtra ? remoteId.trim() || undefined : undefined,
          expire_at: withExtra ? datetimeLocalToISO(expireAt, tz) : undefined,
          remark: remark.trim() || undefined,
        },
      })
      if (res?.code !== 0) {
        toast.error(res?.message || "处理失败")
        return
      }
      toast.success(action === "retry" ? "已重新提交执行" : "已处理")
      queryClient.invalidateQueries({ queryKey: getAdminSupplierOperationsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierOperationsAttentionQueryKey() })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierOperationsByIdQueryKey({ path: { id: operation.id } }) })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierServicesQueryKey() })
      if (operation.module_service_id) {
        queryClient.invalidateQueries({ queryKey: getAdminSupplierServicesByIdQueryKey({ path: { id: operation.module_service_id } }) })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, "处理失败"))
    } finally {
      setSubmitting(false)
    }
  }

  const typeLabel = moduleOpTypeMap[current?.type ?? ""] ?? current?.type

  return (
    <Dialog open={!!operation} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" preventClose>
        <DialogHeader>
          <DialogTitle>处理操作 #{current?.id}</DialogTitle>
          <DialogDescription>
            {typeLabel}{current?.action ? ` · ${current.action}` : ""}
            {current?.module_service_id ? ` · 服务 #${current.module_service_id}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {current?.status === "unknown" && (
            <Alert variant="warning">
              <AlertTriangle />
              <AlertDescription>上游可能已经执行了此操作，请先在上游核对实际结果再处理，避免重复开通或重复扣费。</AlertDescription>
            </Alert>
          )}
          {current?.error_message && (
            <p className="text-xs text-destructive break-all">
              {current.error_code && <span className="font-mono">[{current.error_code}] </span>}
              {current.error_message}
            </p>
          )}

          {isReconcile ? (
            <p className="text-sm text-muted-foreground">对账差异需在上游与本地核对并手动修正后，标记为已处理。</p>
          ) : (
            <RadioGroup value={action} onValueChange={(v) => setAction(v as ResolveAction)} className="gap-2">
              {RESOLVE_ACTIONS.map((a) => (
                <label
                  key={a.value}
                  className="flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={a.value} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.label}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          {action === "mark_succeeded" && !isReconcile && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resolve-remote-id">远端 ID</Label>
                <Input
                  id="resolve-remote-id"
                  value={remoteId}
                  onChange={(e) => setRemoteId(e.target.value)}
                  placeholder="上游服务 ID（可选）"
                  className="font-mono"
                  maxLength={128}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolve-expire-at">上游到期时间</Label>
                <Input
                  id="resolve-expire-at"
                  type="datetime-local"
                  value={expireAt}
                  onChange={(e) => setExpireAt(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resolve-remark">备注</Label>
            <Textarea
              id="resolve-remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="例如：已在上游核对，服务已开通"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
          <Button
            variant={action === "mark_failed" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isReconcile ? "标记已处理" : RESOLVE_ACTIONS.find((a) => a.value === action)?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
