import { useEffect, useRef, useState } from "react"
import { getWSTicket } from "@/lib/ws-ticket"

interface LogViewerProps {
  wsUrl: string
  className?: string
  onDone?: () => void
}

type LogLine = { text: string; type: "step" | "error" | "info" }

function classifyLine(text: string): LogLine {
  if (text.startsWith(">>> ")) return { text, type: "step" }
  if (text.startsWith("错误:") || text.startsWith("Error:")) return { text, type: "error" }
  return { text, type: "info" }
}

const MAX_RETRIES = 10
const BASE_DELAY = 1000
const MAX_DELAY = 30000

export function LogViewer({ wsUrl, className, onDone }: LogViewerProps) {
  const [lines, setLines] = useState<LogLine[]>([])
  const [status, setStatus] = useState<"connecting" | "connected" | "closed" | "error">("connecting")
  const bottomRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    let disposed = false
    let ws: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryCount = 0
    let isReconnect = false

    function attempt() {
      if (disposed) return
      setStatus("connecting")

      getWSTicket().then((ticket) => {
        if (disposed) return
        const sep = wsUrl.includes("?") ? "&" : "?"
        const fullUrl = wsUrl + sep + "token=" + encodeURIComponent(ticket)
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        ws = new WebSocket(`${protocol}//${window.location.host}${fullUrl}`)

        let replacedLines = false

        ws.onopen = () => {
          if (disposed) { ws?.close(); return }
          retryCount = 0
          setStatus("connected")
        }

        ws.onmessage = (e) => {
          if (disposed) return
          if (isReconnect && !replacedLines) {
            replacedLines = true
            setLines([classifyLine(e.data as string)])
            return
          }
          setLines(prev => [...prev, classifyLine(e.data as string)])
        }

        ws.onclose = (e) => {
          if (disposed) return
          if (e.code === 1000) {
            setStatus("closed")
            onDoneRef.current?.()
            return
          }
          scheduleRetry()
        }

        ws.onerror = () => {}
      }).catch(() => {
        if (disposed) return
        scheduleRetry()
      })
    }

    function scheduleRetry() {
      if (disposed) return
      if (retryCount >= MAX_RETRIES) {
        setStatus("error")
        return
      }
      const delay = Math.min(BASE_DELAY * 2 ** retryCount, MAX_DELAY)
      retryCount++
      setStatus("connecting")
      isReconnect = true
      retryTimer = setTimeout(attempt, delay)
    }

    attempt()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
    }
  }, [wsUrl])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  const lineColor: Record<LogLine["type"], string> = {
    step: "text-cyan-400",
    error: "text-red-400",
    info: "text-zinc-400",
  }

  return (
    <div className={`rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col ${className ?? ""}`}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
        <div className={`size-2 rounded-full ${
          status === "connected" ? "bg-green-500" :
          status === "connecting" ? "bg-yellow-500 animate-pulse" :
          status === "error" ? "bg-red-500" :
          "bg-zinc-500"
        }`} />
        <span className="text-xs text-zinc-500">
          {status === "connected" ? "已连接" :
           status === "connecting" ? "连接中..." :
           status === "error" ? "连接失败" :
           "已断开"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed min-h-0">
        {lines.map((line, i) => (
          <div key={i} className={`break-all ${lineColor[line.type]}`}>{line.text}</div>
        ))}
        {status === "closed" && (
          <div className="text-zinc-600 mt-2">--- 结束 ---</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
