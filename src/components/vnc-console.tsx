import { useEffect, useRef, useState, useCallback } from "react"
import RFB from "@novnc/novnc"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Maximize, Minimize, Send } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getWSTicket } from "@/lib/ws-ticket"

export type VncStatus = "connecting" | "connected" | "disconnected"

interface VncConsoleProps {
  wsUrl: string
  className?: string
  onStatusChange?: (status: VncStatus) => void
}

async function buildWsUrl(path: string): Promise<string> {
  const ticket = await getWSTicket()
  const proto = location.protocol === "https:" ? "wss:" : "ws:"
  const sep = path.includes("?") ? "&" : "?"
  return `${proto}//${location.host}${path}${sep}token=${encodeURIComponent(ticket)}`
}

export function VncConsole({ wsUrl, className, onStatusChange }: VncConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rfbRef = useRef<RFB | null>(null)
  const [status, setStatus] = useState<VncStatus>("connecting")
  const [isFullscreen, setIsFullscreen] = useState(false)

  const updateStatus = useCallback(
    (s: VncStatus) => {
      setStatus(s)
      onStatusChange?.(s)
    },
    [onStatusChange],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    updateStatus("connecting")

    let disposed = false
    let rfbInstance: RFB | null = null

    const onConnect = () => updateStatus("connected")
    const onDisconnect = () => {
      updateStatus("disconnected")
      rfbRef.current = null
    }

    buildWsUrl(wsUrl).then((url) => {
      if (disposed) return
      const rfb = new RFB(container, url)
      rfbInstance = rfb
      rfbRef.current = rfb

      rfb.scaleViewport = true
      rfb.resizeSession = false
      rfb.focusOnClick = true

      rfb.addEventListener("connect", onConnect)
      rfb.addEventListener("disconnect", onDisconnect)
    })

    return () => {
      disposed = true
      if (rfbInstance) {
        rfbInstance.removeEventListener("connect", onConnect)
        rfbInstance.removeEventListener("disconnect", onDisconnect)
        rfbInstance.disconnect()
      }
      rfbRef.current = null
    }
  }, [wsUrl, updateStatus])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const toggleFullscreen = () => {
    const el = containerRef.current?.parentElement
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen()
    }
  }

  const sendCtrlAltDel = () => {
    rfbRef.current?.sendCtrlAltDel()
  }

  return (
    <div className={cn("rounded-lg bg-[#0c0c0c] border border-zinc-800 flex flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2">
          {status === "connecting" && (
            <>
              <Spinner />
              <span className="text-xs text-zinc-500">正在连接...</span>
            </>
          )}
          {status === "connected" && (
            <>
              <span className="size-2 rounded-full bg-green-500" />
              <span className="text-xs text-zinc-500">已连接</span>
            </>
          )}
          {status === "disconnected" && (
            <>
              <span className="size-2 rounded-full bg-red-500" />
              <span className="text-xs text-zinc-500">已断开</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {status === "connected" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800" onClick={sendCtrlAltDel}>
              <Send className="size-3" />
              Ctrl+Alt+Del
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden"
      />
    </div>
  )
}
