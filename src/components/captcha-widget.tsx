import { useEffect, useRef } from "react"
import { useSiteSettings } from "@/hooks/use-site-settings"

declare global {
  interface Window {
    __novaix_captcha_init?: (
      container: HTMLDivElement,
      config: Record<string, string>,
      callbacks: {
        onSuccess: (token: string) => void
        onError: (msg: string) => void
        onExpired: () => void
      },
    ) => void
    __novaix_captcha_destroy?: () => void
  }
}

interface CaptchaWidgetProps {
  onSuccess: (token: string) => void
  onError?: (err: string) => void
  onExpired?: () => void
}

export function CaptchaWidget({ onSuccess, onError, onExpired }: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { captcha_public_config } = useSiteSettings()
  const versionRef = useRef(0)
  const callbacksRef = useRef({ onSuccess, onError, onExpired })
  useEffect(() => { callbacksRef.current = { onSuccess, onError, onExpired } })

  useEffect(() => {
    if (!containerRef.current) return
    const version = ++versionRef.current

    let config: Record<string, string> = {}
    if (captcha_public_config) {
      try {
        config = JSON.parse(captcha_public_config)
      } catch {
        // 解析失败忽略
      }
    }

    const script = document.createElement("script")
    script.src = `/api/v1/captcha/widget.js?t=${Date.now()}`
    script.onload = () => {
      if (version !== versionRef.current) return
      if (window.__novaix_captcha_init && containerRef.current) {
        containerRef.current.innerHTML = ""
        window.__novaix_captcha_init(containerRef.current, config, {
          onSuccess: (token) => callbacksRef.current.onSuccess(token),
          onError: (msg) => callbacksRef.current.onError?.(msg),
          onExpired: () => callbacksRef.current.onExpired?.(),
        })
      }
    }
    script.onerror = () => {
      if (version === versionRef.current) callbacksRef.current.onError?.("加载验证码组件失败")
    }
    document.head.appendChild(script)

    const container = containerRef.current
    return () => {
      window.__novaix_captcha_destroy?.()
      delete window.__novaix_captcha_init
      delete window.__novaix_captcha_destroy
      script.remove()
      if (container) container.innerHTML = ""
    }
  }, [captcha_public_config])

  return <div ref={containerRef} className="my-2 *:!w-full" />
}
