import { useState, useCallback } from "react"
import { useSiteSettings } from "@/hooks/use-site-settings"

export function useCaptcha(formName: string) {
  const { captcha_enabled, captcha_forms } = useSiteSettings()
  const [token, setToken] = useState<string | null>(null)

  const required =
    captcha_enabled === "true" &&
    captcha_forms
      .split(",")
      .map((s) => s.trim())
      .includes(formName)

  const reset = useCallback(() => setToken(null), [])

  return { required, token, setToken, reset }
}
