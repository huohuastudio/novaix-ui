import { useQuery } from "@tanstack/react-query"
import { getAdminSettingsByGroupOptions, getAdminProvidersByKindOptions } from "@/api/@tanstack/react-query.gen"

/**
 * 判断邮件渠道是否可用：已启用，且所选渠道的必填项（密码类除外，接口不回显）都已填写。
 * enabled 为 false 时不发请求，返回 undefined。
 */
export function useMailConfigured(enabled: boolean) {
  const mailQuery = useQuery({ ...getAdminSettingsByGroupOptions({ path: { group: "mail" } }), enabled })
  const providersQuery = useQuery({ ...getAdminProvidersByKindOptions({ path: { kind: "mail" } }), enabled })
  const mail = (mailQuery.data?.data ?? {}) as Record<string, string>
  const provider = mail.mail_provider || "smtp"
  const providerQuery = useQuery({
    ...getAdminSettingsByGroupOptions({ path: { group: `mail_${provider}` } }),
    enabled: enabled && mailQuery.isSuccess,
  })
  if (!mailQuery.isSuccess || !providerQuery.isSuccess || !providersQuery.isSuccess) return undefined
  if (mail.mail_enabled === "false") return false
  const values = (providerQuery.data?.data ?? {}) as Record<string, string>
  const def = (providersQuery.data?.data ?? []).find((p) => p.name === provider)
  const required = (def?.fields ?? []).filter((f) => f.required && f.type !== "password")
  return required.every((f) => !!values[`mail_${provider}_${f.key}`])
}
