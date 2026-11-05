import { useState } from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { useSettings } from "@/hooks/use-settings"
import { useFeatureAllowed } from "@/hooks/use-edition"
import { useCurrencySymbol } from "@/hooks/use-site-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ActivationDialog } from "@/components/activation-dialog"
import { centsToYuan, yuanToCents } from "@/lib/order-constants"
import { SettingSkeleton } from "./setting-skeleton"

export function BusinessSection() {
  const { data, loading, saving, save, update } = useSettings("business")
  const supplierAllowed = useFeatureAllowed("supplier_resale")
  const currencySymbol = useCurrencySymbol()
  const [activationOpen, setActivationOpen] = useState(false)

  if (loading) return <SettingSkeleton rows={4} />

  const selfHosted = data.self_hosted_enabled !== "false"
  const supplierEnabled = data.supplier_resale_enabled === "true"
  const syncInterval = data.supplier_sync_interval_minutes ?? "10"
  const alertDefault = data.supplier_balance_alert_default ?? "0"

  const handleSave = async () => {
    const interval = Number(syncInterval)
    if (!Number.isInteger(interval) || interval < 1 || interval > 1440) {
      toast.error("同步间隔必须是 1-1440 之间的整数")
      return
    }
    // save 成功后会刷新站点设置，侧栏菜单随之立即生效
    await save({
      self_hosted_enabled: selfHosted ? "true" : "false",
      supplier_resale_enabled: supplierEnabled ? "true" : "false",
      supplier_sync_interval_minutes: String(interval),
      supplier_balance_alert_default: alertDefault,
    })
  }

  return (
    <div className="max-w-2xl">
      <h3 className="text-sm font-medium">经营模式</h3>
      <p className="text-xs text-muted-foreground mt-1">选择平台的业务形态，可同时开启自营资源与供应商转售</p>

      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>自营资源</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              使用自有节点售卖云服务器。关闭后隐藏节点、实例、网络等菜单与用户端云服务器入口，不影响已有实例运行
            </p>
          </div>
          <Switch
            checked={selfHosted}
            onCheckedChange={(v) => update("self_hosted_enabled", v ? "true" : "false")}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <Label>供应商转售</Label>
              {!supplierAllowed && <Lock className="size-3 text-muted-foreground/60" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              对接上游供应商，将其产品包装为模块商品售卖，由系统代为开通、续费与管理
            </p>
            {!supplierAllowed && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                此功能仅限授权版使用，
                <button type="button" className="underline underline-offset-2 hover:text-amber-700" onClick={() => setActivationOpen(true)}>
                  激活授权
                </button>
                后即可开启
              </p>
            )}
          </div>
          <Switch
            checked={supplierEnabled}
            disabled={!supplierAllowed}
            onCheckedChange={(v) => update("supplier_resale_enabled", v ? "true" : "false")}
          />
        </div>

        {!selfHosted && !supplierEnabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400">两种经营模式均已关闭，用户将无法购买任何产品</p>
        )}
      </div>

      {supplierEnabled && (
        <>
          <Separator className="my-8" />
          <h3 className="text-sm font-medium">供应商转售</h3>
          <p className="text-xs text-muted-foreground mt-1">服务状态同步与上游余额告警的默认参数</p>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="supplier_sync_interval_minutes">同步间隔（分钟）</Label>
              <Input
                id="supplier_sync_interval_minutes"
                type="number"
                min={1}
                max={1440}
                value={syncInterval}
                onChange={(e) => update("supplier_sync_interval_minutes", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">定期从上游同步服务状态、到期时间与连接余额，范围 1-1440</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_balance_alert_default">默认余额告警阈值（{currencySymbol}）</Label>
              <Input
                id="supplier_balance_alert_default"
                type="number"
                min={0}
                step="0.01"
                // 按元展示，存储仍为分
                value={String(centsToYuan(parseInt(alertDefault || "0")))}
                onChange={(e) => {
                  const yuan = parseFloat(e.target.value || "0")
                  update("supplier_balance_alert_default", String(Number.isFinite(yuan) && yuan > 0 ? yuanToCents(yuan) : 0))
                }}
              />
              <p className="text-xs text-muted-foreground">连接未单独设置阈值时，上游余额低于此值即发送告警，0 表示不告警</p>
            </div>
          </div>
        </>
      )}

      <div className="pt-8">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>

      {activationOpen && <ActivationDialog open={activationOpen} onOpenChange={setActivationOpen} />}
    </div>
  )
}
