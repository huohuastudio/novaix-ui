import { useEffect, useRef, useState } from "react"
import { useDemoMode, useSiteSettings } from "@/hooks/use-site-settings"

function useCountdown(resetAt: string) {
  const [remaining, setRemaining] = useState("")

  useEffect(() => {
    if (!resetAt) return

    const update = () => {
      const diff = new Date(resetAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining("即将重置...")
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`
      )
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [resetAt])

  return remaining
}

export default function DemoBanner() {
  const isDemo = useDemoMode()
  const { demo_reset_at } = useSiteSettings()
  const ref = useRef<HTMLDivElement>(null)
  const countdown = useCountdown(demo_reset_at)

  useEffect(() => {
    if (!isDemo || !ref.current) return
    document.documentElement.style.setProperty(
      "--demo-banner-height",
      `${ref.current.offsetHeight}px`
    )
    return () => {
      document.documentElement.style.removeProperty("--demo-banner-height")
    }
  }, [isDemo])

  if (!isDemo) return null

  return (
    <div
      ref={ref}
      className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-sm text-center py-1.5 px-4"
    >
      <span>
        当前为演示环境
        {countdown && (
          <>
            ，数据将在 <strong className="font-mono tabular-nums">{countdown}</strong> 后重置
          </>
        )}
        {" — "}
        管理后台：<strong>admin</strong> / <strong>demo123</strong>
        {" | "}
        用户前台：<strong>bob</strong> / <strong>demo123</strong>
      </span>
    </div>
  )
}
