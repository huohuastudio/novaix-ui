import { useEffect, useRef, useState } from "react"

export function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width)
      const h = Math.floor(entry.contentRect.height)
      if (w > 0 && h > 0) {
        setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, ...size }
}
