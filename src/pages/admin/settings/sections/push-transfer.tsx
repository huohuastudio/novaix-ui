import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingSkeleton } from "./setting-skeleton"

export function PushTransferSection() {
  const { data, loading, saving, save, update } = useSettings("push_transfer")

  if (loading) return <SettingSkeleton rows={9} />

  const enabled = data.push_transfer_enabled === "true"
  const feeType = data.push_transfer_fee_type || "none"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>启用实例转移</Label>
          <p className="text-xs text-muted-foreground">允许用户通过转移码将实例所有权转移给其他用户</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => update("push_transfer_enabled", v ? "true" : "false")}
        />
      </div>

      <div className="space-y-2">
        <Label>手续费类型</Label>
        <Select
          value={feeType}
          onValueChange={(v) => update("push_transfer_fee_type", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">无</SelectItem>
            <SelectItem value="fixed">固定金额</SelectItem>
            <SelectItem value="percent">按比例</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {feeType !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="push_transfer_fee_amount">
            {feeType === "fixed" ? "手续费金额（分）" : "手续费比例（%）"}
          </Label>
          <Input
            id="push_transfer_fee_amount"
            type="number"
            min={0}
            max={feeType === "percent" ? 100 : undefined}
            value={data.push_transfer_fee_amount ?? "0"}
            onChange={(e) => update("push_transfer_fee_amount", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {feeType === "fixed"
              ? "固定手续费金额，单位为分（如 500 = 5 元）"
              : "按实例当前计费周期价格的百分比收取手续费"}
          </p>
        </div>
      )}

      {feeType !== "none" && (
        <div className="space-y-2">
          <Label>费用承担方</Label>
          <Select
            value={data.push_transfer_fee_payer || "sender"}
            onValueChange={(v) => update("push_transfer_fee_payer", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sender">发起方（转出方）</SelectItem>
              <SelectItem value="receiver">接收方（转入方）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>发起方需实名认证</Label>
          <p className="text-xs text-muted-foreground">要求转出方完成实名认证后才能发起转移</p>
        </div>
        <Switch
          checked={data.push_transfer_require_sender_kyc === "true"}
          onCheckedChange={(v) => update("push_transfer_require_sender_kyc", v ? "true" : "false")}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>接收方需实名认证</Label>
          <p className="text-xs text-muted-foreground">要求转入方完成实名认证后才能接收转移</p>
        </div>
        <Switch
          checked={data.push_transfer_require_receiver_kyc === "true"}
          onCheckedChange={(v) => update("push_transfer_require_receiver_kyc", v ? "true" : "false")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="push_transfer_expire_hours">转移码有效期（小时）</Label>
        <Input
          id="push_transfer_expire_hours"
          type="number"
          min={1}
          max={720}
          value={data.push_transfer_expire_hours ?? "72"}
          onChange={(e) => update("push_transfer_expire_hours", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">转移码在此时间后自动过期失效，已扣手续费将退还</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="push_transfer_protection_days">保护期（天）</Label>
        <Input
          id="push_transfer_protection_days"
          type="number"
          min={0}
          max={365}
          value={data.push_transfer_protection_days ?? "0"}
          onChange={(e) => update("push_transfer_protection_days", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">实例创建后多少天内不允许转移，0 表示无保护期</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>需要管理员审批</Label>
          <p className="text-xs text-muted-foreground">接收方确认后需管理员审批才能完成转移</p>
        </div>
        <Switch
          checked={data.push_transfer_require_approval === "true"}
          onCheckedChange={(v) => update("push_transfer_require_approval", v ? "true" : "false")}
        />
      </div>

      <div className="pt-2">
        <Button onClick={() => save(data)} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
