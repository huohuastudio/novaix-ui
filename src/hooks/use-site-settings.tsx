import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { getSettingsPublic } from "@/api"
import { formatAmount } from "@/lib/order-constants"
import { setUnlicensed } from "@/hooks/use-license"

interface SiteSettings {
  site_name: string
  site_url: string
  site_logo: string
  site_favicon: string
  currency_code: string
  currency_symbol: string
  timezone: string
  maintenance_enabled: string
  maintenance_message: string
  tos_url: string
  privacy_url: string
  registration_enabled: string
  registration_email_verify: string
  kyc_enabled: string
  sms_enabled: string
  admin_path: string
  demo_mode: string
  demo_reset_at: string
  instance_hostname_prefix: string
  instance_hostname_suffix_type: string
  instance_hostname_suffix_length: string
  instance_auto_password: string
  instance_auto_password_length: string
  oauth_providers: string
  captcha_enabled: string
  captcha_forms: string
  captcha_provider: string
  captcha_public_config: string
  ticket_departments: string
}

const defaultSettings: SiteSettings = {
  site_name: "Novaix",
  site_url: "",
  site_logo: "",
  site_favicon: "",
  currency_code: "CNY",
  currency_symbol: "¥",
  timezone: "Asia/Shanghai",
  maintenance_enabled: "false",
  maintenance_message: "系统维护中，请稍后再试",
  tos_url: "",
  privacy_url: "",
  registration_enabled: "false",
  registration_email_verify: "true",
  kyc_enabled: "false",
  sms_enabled: "false",
  admin_path: "admin",
  demo_mode: "false",
  demo_reset_at: "",
  instance_hostname_prefix: "",
  instance_hostname_suffix_type: "random_alpha_num",
  instance_hostname_suffix_length: "8",
  instance_auto_password: "true",
  instance_auto_password_length: "16",
  oauth_providers: "",
  captcha_enabled: "false",
  captcha_forms: "",
  captcha_provider: "",
  captcha_public_config: "",
  ticket_departments: "",
}

const SiteSettingsContext = createContext<SiteSettings>(defaultSettings)

let _adminBasePath = "/admin"

// eslint-disable-next-line react-refresh/only-export-components
export function getAdminBasePath() {
  return _adminBasePath
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSettingsPublic()
      .then(({ data: res }) => {
        if (res?.code === 0 && res.data) {
          const data = res.data as Record<string, string>
          if (data.licensed !== "true") {
            setUnlicensed()
          }
          const merged = { ...defaultSettings, ...data }
          if (merged.admin_path) {
            _adminBasePath = `/${merged.admin_path.replace(/^\/+|\/+$/g, "")}`
          }
          setSettings(merged)
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (settings.site_favicon) {
      const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
      if (link) {
        link.href = settings.site_favicon
      }
    }
  }, [settings.site_favicon])

  useEffect(() => {
    if (settings.site_name) {
      document.title = settings.site_name
    }
  }, [settings.site_name])

  if (!loaded) return null

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrencySymbol() {
  return useContext(SiteSettingsContext).currency_symbol
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSiteName() {
  return useContext(SiteSettingsContext).site_name
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormatAmount() {
  const symbol = useContext(SiteSettingsContext).currency_symbol
  return useCallback((cents: number | undefined) => formatAmount(cents, symbol), [symbol])
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminPath() {
  useContext(SiteSettingsContext)
  return _adminBasePath
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDemoMode() {
  return useContext(SiteSettingsContext).demo_mode === "true"
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormatDate() {
  const tz = useContext(SiteSettingsContext).timezone
  return useCallback(
    (dateStr: string | undefined | null) => {
      if (!dateStr || dateStr === "0001-01-01T00:00:00Z") return "-"
      return new Date(dateStr).toLocaleString("zh-CN", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    },
    [tz],
  )
}
