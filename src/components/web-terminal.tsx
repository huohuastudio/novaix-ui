import { useEffect, useRef, useState, useCallback } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { RotateCw, Trash2, Copy, Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getWSTicket } from "@/lib/ws-ticket"
import "@xterm/xterm/css/xterm.css"

const MSG_TYPE_DATA = 0x00
const MSG_TYPE_RESIZE = 0x01

const textEncoder = new TextEncoder()

const TERMINAL_THEME = {
  background: "#0c0c0c",
  foreground: "#cccccc",
  cursor: "#ffffff",
  cursorAccent: "#0c0c0c",
  selectionBackground: "#264f78",
  selectionForeground: "#ffffff",
  black: "#0c0c0c",
  red: "#c94f22",
  green: "#13a10e",
  yellow: "#c19c00",
  blue: "#3b78ff",
  magenta: "#881798",
  cyan: "#3a96dd",
  white: "#cccccc",
  brightBlack: "#767676",
  brightRed: "#e74856",
  brightGreen: "#16c60c",
  brightYellow: "#f9f1a5",
  brightBlue: "#3b78ff",
  brightMagenta: "#b4009e",
  brightCyan: "#61d6d6",
  brightWhite: "#f2f2f2",
} as const

const toolbarBtnClass = "size-7 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"

interface WebTerminalProps {
  wsUrl: string
  className?: string
  autoRetry?: boolean
  onStatusChange?: (status: ConnectionStatus) => void
}

export type ConnectionStatus = "connecting" | "connected" | "closed" | "error"

export function WebTerminal({ wsUrl, className, autoRetry, onStatusChange }: WebTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const disposedRef = useRef(false)
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [connectKey, setConnectKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const retryCountRef = useRef(0)
  const onStatusChangeRef = useRef(onStatusChange)
  useEffect(() => { onStatusChangeRef.current = onStatusChange }, [onStatusChange])

  const updateStatus = useCallback((s: ConnectionStatus) => {
    if (disposedRef.current) return
    setStatus(s)
    onStatusChangeRef.current?.(s)
  }, [])

  useEffect(() => {
    if (status !== "connected") return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [status])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    disposedRef.current = false

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.15,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
      theme: TERMINAL_THEME,
      allowProposedApi: true,
    })
    termRef.current = term

    const fit = new FitAddon()
    fitRef.current = fit
    term.loadAddon(fit)
    term.open(container)
    requestAnimationFrame(() => fit.fit())

    let retryTimer: ReturnType<typeof setTimeout>

    const connectTimer = setTimeout(() => {
      if (disposedRef.current) return

      ;(async () => {
      const ticket = await getWSTicket()
      if (disposedRef.current) return
      const sep = wsUrl.includes("?") ? "&" : "?"
      const cols = term.cols
      const rows = term.rows
      const fullUrl = wsUrl + sep + "token=" + encodeURIComponent(ticket) + `&cols=${cols}&rows=${rows}`
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const ws = new WebSocket(`${protocol}//${window.location.host}${fullUrl}`)
      ws.binaryType = "arraybuffer"
      wsRef.current = ws

      ws.onmessage = (e) => {
        if (disposedRef.current) return
        const buf = new Uint8Array(e.data as ArrayBuffer)
        if (buf.length > 1 && buf[0] === MSG_TYPE_DATA) {
          term.write(buf.slice(1))
        }
      }

      ws.onopen = () => {
        if (disposedRef.current) { ws.close(); return }
        retryCountRef.current = 0
        updateStatus("connected")
        sendResize(ws, term.cols, term.rows)
        term.focus()
      }

      ws.onclose = (e) => {
        if (disposedRef.current) return
        if (e.code === 1000) {
          updateStatus("closed")
          return
        }
        if (autoRetry && retryCountRef.current < 5) {
          retryCountRef.current++
          const delay = retryCountRef.current * 2000
          term.write(`\r\n\x1b[33m连接失败，${delay / 1000}秒后重试 (${retryCountRef.current}/5)...\x1b[0m\r\n`)
          retryTimer = setTimeout(() => {
            if (!disposedRef.current) {
              setConnectKey(k => k + 1)
            }
          }, delay)
        } else {
          updateStatus("error")
        }
      }
      ws.onerror = () => {}
      })()
    }, 50)

    const onData = term.onData((data) => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        const encoded = textEncoder.encode(data)
        const msg = new Uint8Array(1 + encoded.length)
        msg[0] = MSG_TYPE_DATA
        msg.set(encoded, 1)
        ws.send(msg)
      }
    })

    const onResize = term.onResize(({ cols, rows }) => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        sendResize(ws, cols, rows)
      }
    })

    let resizeTimer: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!disposedRef.current) fit.fit()
      }, 50)
    })
    observer.observe(container)

    return () => {
      disposedRef.current = true
      clearTimeout(connectTimer)
      clearTimeout(resizeTimer)
      clearTimeout(retryTimer)
      observer.disconnect()
      onData.dispose()
      onResize.dispose()
      wsRef.current?.close()
      wsRef.current = null
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [wsUrl, connectKey, autoRetry, updateStatus])

  const handleReconnect = () => {
    setConnectKey(k => k + 1)
    setStatus("connecting")
  }

  const handleClear = () => {
    termRef.current?.clear()
  }

  const handleCopy = () => {
    const selection = termRef.current?.getSelection()
    if (selection) {
      navigator.clipboard.writeText(selection)
      toast.success("已复制到剪贴板")
    } else {
      toast.info("请先选中终端中的文本")
    }
  }

  const handleFullscreen = () => {
    setIsFullscreen(prev => !prev)
    setTimeout(() => fitRef.current?.fit(), 50)
  }

  const statusDot = status === "connected" ? "bg-green-500"
    : status === "connecting" ? "bg-yellow-500 animate-pulse"
    : status === "error" ? "bg-red-500"
    : "bg-zinc-600"

  const statusText = status === "connected" ? "已连接"
    : status === "connecting" ? "连接中..."
    : status === "error" ? "连接失败"
    : "已断开"

  const canReconnect = status === "closed" || status === "error"

  return (
    <div
      className={cn(
        "rounded-lg bg-[#0c0c0c] border border-zinc-800 flex flex-col overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-0",
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${statusDot}`} />
          <span className="text-xs text-zinc-500">{statusText}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {canReconnect && (
            <Button variant="ghost" size="icon" className={toolbarBtnClass} onClick={handleReconnect} title="重新连接">
              <RotateCw className="size-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className={toolbarBtnClass} onClick={handleCopy} title="复制选中">
            <Copy className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className={toolbarBtnClass} onClick={handleClear} title="清屏">
            <Trash2 className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className={toolbarBtnClass} onClick={handleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}>
            {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="terminal-body flex-1 min-h-0" />
    </div>
  )
}

function sendResize(ws: WebSocket, cols: number, rows: number) {
  const msg = new Uint8Array(5)
  msg[0] = MSG_TYPE_RESIZE
  msg[1] = (cols >> 8) & 0xff
  msg[2] = cols & 0xff
  msg[3] = (rows >> 8) & 0xff
  msg[4] = rows & 0xff
  ws.send(msg)
}
