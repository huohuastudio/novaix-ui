import { toast } from "sonner"
import { postAdminSettingsSmsTest } from "@/api"
import { ProviderSettingsForm } from "@/components/provider-settings-form"
import { getErrorMessage } from "@/lib/utils"

export function SMSSection() {
  return (
    <ProviderSettingsForm
      kind="sms"
      title="短信"
      description="配置短信渠道，用于发送注册、登录等场景的验证码短信"
      enableLabel="启用短信"
      enableHint="启用后系统可通过短信发送验证码"
      selectPlaceholder="请选择短信渠道"
      test={{
        label: "测试发送",
        placeholder: "输入接收测试短信的手机号",
        send: async (phone) => {
          try {
            const { data: res } = await postAdminSettingsSmsTest({ body: { phone } })
            if (res?.code === 0) {
              toast.success("测试短信已发送")
              return true
            }
            toast.error(res?.message ?? "发送失败")
            return false
          } catch (err) {
            toast.error(getErrorMessage(err, "发送失败"))
            return false
          }
        },
      }}
    />
  )
}
