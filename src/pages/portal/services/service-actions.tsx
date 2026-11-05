import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Camera,
  KeyRound,
  LifeBuoy,
  Loader2,
  Play,
  RefreshCw,
  RotateCw,
  Square,
  Terminal,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import type { ProviderField, ServicePortalServiceOperation, SupplierAction } from "@/api"
import { postPortalServicesByIdActionsByName } from "@/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGrid } from "@/components/provider-settings-form"
import { useConfirm } from "@/hooks/use-confirm"
import { useSupplierDynamicConfig } from "@/hooks/use-supplier-meta"
import { collectDynamicValues, dynamicFieldValues, validateDynamicFields } from "@/lib/supplier-constants"
import { getErrorMessage } from "@/lib/utils"

/** 按操作名推断图标（无匹配时使用通用图标） */
function actionIcon(name = ""): LucideIcon {
  const n = name.toLowerCase()
  if (/reboot|restart/.test(n)) return RotateCw
  if (/reinstall|rebuild/.test(n)) return RefreshCw
  if (/password|passwd/.test(n)) return KeyRound
  if (/rescue/.test(n)) return LifeBuoy
  if (/snapshot|backup/.test(n)) return Camera
  if (/vnc|console|terminal/.test(n)) return Terminal
  if (/stop|shutdown|halt|power_?off/.test(n)) return Square
  if (/start|boot|power_?on/.test(n)) return Play
  return Wrench
}

/** 带参数的操作表单弹窗（以 key 重新挂载来重置表单） */
function ActionFormDialog({
  action,
  submitting,
  onCancel,
  onSubmit,
}: {
  action: SupplierAction
  submitting: boolean
  onCancel: () => void
  onSubmit: (input: Record<string, string>) => void
}) {
  const fields = useMemo<ProviderField[]>(() => action.fields ?? [], [action.fields])
  const { config: values, errors, setErrors, change } = useSupplierDynamicConfig()

  // 合并默认值，供条件显示与提交使用
  const fieldValues = useMemo(() => dynamicFieldValues(fields, values), [fields, values])

  const handleSubmit = () => {
    const nextErrors = validateDynamicFields(fields, values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit(collectDynamicValues(fields, values))
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onCancel() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          {action.confirm && (
            <DialogDescription className={action.danger ? "text-destructive" : undefined}>
              {action.confirm}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-2">
          <FieldGrid
            fields={fields}
            fieldValues={fieldValues}
            errors={errors}
            getValue={(f) => fieldValues[f.key ?? ""] ?? ""}
            onChange={change}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>取消</Button>
          <Button variant={action.danger ? "destructive" : "default"} onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            确认执行
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ServiceActions({
  serviceId,
  actions,
  loading,
  error,
  busy,
  onSubmitted,
}: {
  serviceId: number
  actions: SupplierAction[]
  loading: boolean
  error: boolean
  /** 有操作进行中时禁用全部按钮 */
  busy: boolean
  onSubmitted: (op: ServicePortalServiceOperation, action: SupplierAction) => void
}) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [formAction, setFormAction] = useState<SupplierAction | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const run = async (action: SupplierAction, input?: Record<string, string>) => {
    if (!action.name) return
    setSubmitting(action.name)
    try {
      const { data: res } = await postPortalServicesByIdActionsByName({
        path: { id: serviceId, name: action.name },
        body: input && Object.keys(input).length > 0 ? { input } : {},
      })
      if (res?.code === 0 && res.data) {
        setFormAction(null)
        onSubmitted(res.data, action)
      } else {
        toast.error(res?.message || "操作提交失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作提交失败"))
    } finally {
      setSubmitting(null)
    }
  }

  const handleClick = async (action: SupplierAction) => {
    if ((action.fields ?? []).length > 0) {
      setFormAction(action)
      return
    }
    if (action.confirm || action.danger) {
      const ok = await confirm({
        title: action.label,
        description: action.confirm || `确定要执行「${action.label}」吗？`,
        confirmText: "确认执行",
        destructive: action.danger,
      })
      if (!ok) return
    }
    await run(action)
  }

  if (!loading && !error && actions.length === 0) return null

  return (
    <>
      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">管理操作</h2>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-background p-5">
                <Skeleton className="size-5 mb-2" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-24 mt-1.5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-background p-5">
            <p className="text-sm text-muted-foreground">操作列表暂时无法加载，请稍后刷新重试</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {actions.map((action) => {
              const Icon = actionIcon(action.name)
              const hasFields = (action.fields ?? []).length > 0
              const isSubmitting = submitting === action.name
              return (
                <button
                  key={action.name}
                  className="rounded-2xl bg-background p-5 text-left hover:bg-foreground/[.05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
                  onClick={() => handleClick(action)}
                  disabled={busy || !!submitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-5 text-muted-foreground mb-2 animate-spin" />
                  ) : (
                    <Icon className={`size-5 mb-2 ${action.danger ? "text-destructive/80" : "text-muted-foreground"}`} />
                  )}
                  <p className={`text-sm font-medium ${action.danger ? "text-destructive" : ""}`}>{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasFields ? "填写参数后执行" : action.danger ? "请谨慎操作" : "点击后立即执行"}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {formAction && (
        <ActionFormDialog
          key={formAction.name}
          action={formAction}
          submitting={submitting === formAction.name}
          onCancel={() => setFormAction(null)}
          onSubmit={(input) => run(formAction, input)}
        />
      )}

      {ConfirmDialog}
    </>
  )
}
