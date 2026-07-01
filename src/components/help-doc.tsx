import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { CircleHelp, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const DOCS_BASE_URL = "https://docs.huohuastudio.com"
const DOCS_ORIGIN = new URL(DOCS_BASE_URL).origin

interface HelpDocState {
  url: string | null
  open: (path: string) => void
  close: () => void
}

const HelpDocContext = createContext<HelpDocState>({
  url: null,
  open: () => {},
  close: () => {},
})

export function HelpDocProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null)

  const open = useCallback((path: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`
    const u = new URL(normalized, DOCS_BASE_URL)
    u.searchParams.set("embed", "1")
    setUrl(u.toString())
  }, [])

  const close = useCallback(() => setUrl(null), [])

  return (
    <HelpDocContext.Provider value={{ url, open, close }}>
      {children}
      {url && <HelpDocPopup key={url} url={url} onClose={close} />}
    </HelpDocContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHelpDoc() {
  return useContext(HelpDocContext)
}

export function HelpLink({
  path,
  className,
  label,
}: {
  path: string
  className?: string
  label?: string
}) {
  const { open } = useHelpDoc()

  return (
    <button
      type="button"
      aria-label={label ?? "打开帮助文档"}
      onClick={() => open(path)}
      className={cn(
        "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
    >
      <CircleHelp className="size-4" />
      {label && <span className="text-sm">{label}</span>}
    </button>
  )
}

function HelpDocPopup({ url, onClose }: { url: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    const handleMessage = (e: MessageEvent) => {
      if (e.origin === DOCS_ORIGIN && e.data === "help-doc-close") {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown, true)
    window.addEventListener("message", handleMessage)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      window.removeEventListener("message", handleMessage)
    }
  }, [onClose])

  const externalUrl = useMemo(() => {
    const u = new URL(url)
    u.searchParams.delete("embed")
    return u.toString()
  }, [url])

  return (
    <div
      data-outside-ignore
      className="pointer-events-auto fixed bottom-4 right-4 z-[60] flex w-[480px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200"
      style={{ height: "min(600px, calc(100vh - 2rem))" }}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">帮助文档</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" asChild>
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 space-y-4 p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        <iframe
          src={url}
          className="size-full border-0"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  )
}
