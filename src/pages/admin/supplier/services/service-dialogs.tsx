import { useEffect, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { putAdminSupplierServicesById } from "@/api"
import type { ServiceAdminModuleServiceDetail, SupplierAction, SupplierUpdateServiceRequest } from "@/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGrid } from "@/components/provider-settings-form"
import { useSiteSettings, useTimezone } from "@/hooks/use-site-settings"
import { useSupplierDynamicConfig } from "@/hooks/use-supplier-meta"
import { serverToDatetimeLocal } from "@/lib/datetime"
import {
  collectDynamicValues,
  datetimeLocalToISO,
  dynamicFieldValue,
  dynamicFieldValues,
  validateDynamicFields,
} from "@/lib/supplier-constants"
import { getErrorMessage } from "@/lib/utils"

/** 编辑服务：名称、到期时间、自动续费、补录远端 ID（仅修改本地记录，不调用上游） */
export function ServiceEditDialog({
  open,
  onOpenChange,
  service,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: ServiceAdminModuleServiceDetail
  onSuccess: () => void
}) {
  const tz = useTimezone()
  const [name, setName] = useState("")
  const [expireAt, setExpireAt] = useState("")
  const [autoRenew, setAutoRenew] = useState(false)
  const [remoteId, setRemoteId] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const initialExpire = serverToDatetimeLocal(service.expire_at, tz)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时按服务数据重置表单
      setName(service.name ?? "")
      setExpireAt(serverToDatetimeLocal(service.expire_at, tz))
      setAutoRenew(service.auto_renew ?? false)
      setRemoteId(service.remote_id ?? "")
      setError("")
    }
  }, [open, service, tz])

  const handleSave = async () => {
    setError("")
    const trimmedName = name.trim()
    if (!trimmedName || trimmedName.length > 64) {
      setError("名称不能为空且不超过 64 个字符")
      return
    }
    if (remoteId.trim().length > 128) {
      setError("远端 ID 不能超过 128 个字符")
      return
    }
    // 只提交有变化的字段，避免到期时间因精度丢失被意外改写
    const body: SupplierUpdateServiceRequest = {}
    if (trimmedName !== (service.name ?? "")) body.name = trimmedName
    if (autoRenew !== (service.auto_renew ?? false)) body.auto_renew = autoRenew
    if (remoteId.trim() !== (service.remote_id ?? "")) body.remote_id = remoteId.trim()
    if (expireAt && expireAt !== initialExpire) body.expire_at = datetimeLocalToISO(expireAt, tz)
    if (Object.keys(body).length === 0) {
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      const { data: res } = await putAdminSupplierServicesById({ path: { id: service.id! }, body })
      if (res?.code !== 0) {
        setError(res?.message || "保存失败")
        return
      }
      toast.success("服务已更新")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(getErrorMessage(err, "保存失败"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>编辑服务</DialogTitle>
          <DialogDescription>仅修改本地记录，不会同步到上游</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name">名称</Label>
            <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={64} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-expire">到期时间</Label>
            <Input id="svc-expire" type="datetime-local" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} />
            <p className="text-xs text-muted-foreground">本地到期时间决定续费与到期暂停，通常与上游到期时间保持一致</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-remote-id">远端 ID</Label>
            <Input
              id="svc-remote-id"
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              className="font-mono"
              placeholder="上游服务 ID"
              maxLength={128}
            />
            <p className="text-xs text-muted-foreground">开通结果未知且已在上游核对时，可在此补录</p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="svc-auto-renew">自动续费</Label>
              <p className="text-xs text-muted-foreground mt-0.5">到期前自动从用户余额扣费续费</p>
            </div>
            <Switch id="svc-auto-renew" checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 带参数的自定义操作：按插件声明的字段渲染表单 */
export function ServiceActionDialog({
  action,
  onOpenChange,
  onSubmit,
}: {
  action: SupplierAction | null
  onOpenChange: (open: boolean) => void
  onSubmit: (action: SupplierAction, input: Record<string, string>) => Promise<boolean>
}) {
  const { site_url: siteURL } = useSiteSettings()
  const dyn = useSupplierDynamicConfig()
  const { setConfig, setErrors } = dyn
  const [submitting, setSubmitting] = useState(false)
  // 关闭动画期间保留上一次的操作内容，避免标题与表单闪空
  const [shown, setShown] = useState(action)
  if (action && action !== shown) setShown(action)
  const current = action ?? shown
  const fields = current?.fields ?? []

  useEffect(() => {
    if (action) {
      setConfig({})
      setErrors({})
    }
  }, [action, setConfig, setErrors])

  const handleSubmit = async () => {
    if (!action) return
    const errs = validateDynamicFields(fields, dyn.config)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    const ok = await onSubmit(action, collectDynamicValues(fields, dyn.config))
    setSubmitting(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={!!action} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" preventClose>
        <DialogHeader>
          <DialogTitle>{current?.label || current?.name}</DialogTitle>
          <DialogDescription>填写参数后提交，操作将异步执行</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {(current?.danger || current?.confirm) && (
            <Alert variant={current?.danger ? "destructive" : "warning"}>
              <AlertTriangle />
              <AlertDescription>{current?.confirm || "这是一个危险操作，执行后可能无法恢复，请确认后再提交。"}</AlertDescription>
            </Alert>
          )}
          <FieldGrid
            fields={fields}
            fieldValues={dynamicFieldValues(fields, dyn.config)}
            errors={dyn.errors}
            getValue={(f) => dynamicFieldValue(f, dyn.config)}
            onChange={(f, v) => dyn.change(f, v)}
            siteURL={siteURL}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
          <Button variant={current?.danger ? "destructive" : "default"} onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {current?.danger ? "确认执行" : "执行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
