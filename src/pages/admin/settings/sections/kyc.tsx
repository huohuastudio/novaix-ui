import { ProviderSettingsForm } from "@/components/provider-settings-form"

export function KYCSection() {
  return (
    <ProviderSettingsForm
      kind="kyc"
      title="实名认证"
      description="配置身份二要素验证（姓名 + 身份证号），启用后用户可在个人资料中完成实名认证"
      enableLabel="启用实名认证"
      enableHint="启用后用户可以提交实名认证"
      selectPlaceholder="请选择验证渠道"
    />
  )
}
