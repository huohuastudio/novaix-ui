import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ProviderSettingsForm } from "@/components/provider-settings-form"

export function KYCSection() {
  return (
    <ProviderSettingsForm
      kind="kyc"
      title="实名认证"
      description="配置身份验证，支持二要素（姓名 + 身份证号）和人脸识别两种模式，启用后用户可在个人资料中完成实名认证"
      enableLabel="启用实名认证"
      enableHint="启用后用户可以提交实名认证"
      selectPlaceholder="请选择验证渠道"
      renderExtra={({ enabled, data, update }) => {
        if (!enabled) return null
        return (
          <div className="space-y-3 pt-4">
            <Label>认证模式</Label>
            <p className="text-xs text-muted-foreground">
              二要素验证仅校验姓名与身份证号是否一致，人脸识别需用户完成 H5 活体检测
            </p>
            <RadioGroup
              value={data.kyc_mode || "two_factor"}
              onValueChange={(v) => update("kyc_mode", v)}
              className="gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="two_factor" id="kyc-mode-two" />
                <Label htmlFor="kyc-mode-two" className="font-normal cursor-pointer">
                  二要素验证（姓名 + 身份证号）
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="face" id="kyc-mode-face" />
                <Label htmlFor="kyc-mode-face" className="font-normal cursor-pointer">
                  人脸识别（H5 活体检测）
                </Label>
              </div>
            </RadioGroup>
          </div>
        )
      }}
    />
  )
}
