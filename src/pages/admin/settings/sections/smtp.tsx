import { toast } from "sonner"
import { postAdminSettingsSmtpTest } from "@/api"
import { ProviderSettingsForm } from "@/components/provider-settings-form"
import { getErrorMessage } from "@/lib/utils"

export function SmtpSection() {
  return (
    <ProviderSettingsForm
      kind="mail"
      title="邮件通知"
      description="配置邮件发送渠道，用于发送验证码、通知与告警邮件"
      enableLabel="启用邮件"
      enableHint="关闭后系统将不再发送任何邮件"
      selectPlaceholder="请选择邮件渠道"
      test={{
        label: "发送测试邮件",
        placeholder: "输入接收测试邮件的邮箱",
        send: async (email) => {
          try {
            const { data: res } = await postAdminSettingsSmtpTest({ body: { to: email } })
            if (res?.code === 0) {
              toast.success("测试邮件已发送")
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
