import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export interface BreadcrumbEntry {
  label: string
  href?: string
}

interface BreadcrumbContextValue {
  items: BreadcrumbEntry[]
  setItems: (items: BreadcrumbEntry[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbEntry[]>([])
  const value = useMemo(() => ({ items, setItems }), [items])
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBreadcrumb(items: BreadcrumbEntry[]) {
  const ctx = useContext(BreadcrumbContext)
  if (!ctx) throw new Error("useBreadcrumb must be used within BreadcrumbProvider")
  const { setItems } = ctx
  const serialized = JSON.stringify(items)

  useEffect(() => {
    setItems(JSON.parse(serialized) as BreadcrumbEntry[])
  }, [setItems, serialized])
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBreadcrumbItems() {
  const ctx = useContext(BreadcrumbContext)
  if (!ctx) throw new Error("useBreadcrumbItems must be used within BreadcrumbProvider")
  return ctx.items
}
