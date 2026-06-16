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
  const initializedRef = useRef(false)
  const callbacksRef = useRef({ onSuccess, onError, onExpired })
  useEffect(() => { callbacksRef.current = { onSuccess, onError, onExpired } })

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return

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
      if (window.__novaix_captcha_init && containerRef.current) {
        initializedRef.current = true
        window.__novaix_captcha_init(containerRef.current, config, {
          onSuccess: (token) => callbacksRef.current.onSuccess(token),
          onError: (msg) => callbacksRef.current.onError?.(msg),
          onExpired: () => callbacksRef.current.onExpired?.(),
        })
      }
    }
    script.onerror = () => callbacksRef.current.onError?.("加载验证码组件失败")
    document.head.appendChild(script)

    return () => {
      window.__novaix_captcha_destroy?.()
      delete window.__novaix_captcha_init
      delete window.__novaix_captcha_destroy
      script.remove()
      initializedRef.current = false
    }
  }, [captcha_public_config])

  return <div ref={containerRef} className="my-2" />
}
