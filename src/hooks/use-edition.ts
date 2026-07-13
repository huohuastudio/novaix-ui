import { useMemo } from "react"
import { useSiteSettings } from "@/hooks/use-site-settings"

export interface FeatureInfo {
  key: string
  label: string
  free: boolean
  paid: boolean
}

export function useEdition(): string {
  const { edition } = useSiteSettings()
  return edition || "free"
}

export function useIsPaid(): boolean {
  return useEdition() === "paid"
}

export function useFeatures(): FeatureInfo[] {
  const { features } = useSiteSettings()
  // 配置字符串引用稳定时只解析一次，避免每次渲染重复 JSON.parse
  return useMemo(() => {
    try {
      return JSON.parse(features || "[]")
    } catch {
      return []
    }
  }, [features])
}

export function useFeatureAllowed(key: string): boolean {
  const edition = useEdition()
  const features = useFeatures()
  if (edition === "paid") return true
  const f = features.find(item => item.key === key)
  return f ? f.free : true
}
