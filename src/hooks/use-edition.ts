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
  try {
    return JSON.parse(features || "[]")
  } catch {
    return []
  }
}

export function useFeatureAllowed(key: string): boolean {
  const edition = useEdition()
  if (edition === "paid") return true
  const features = useFeatures()
  const f = features.find(item => item.key === key)
  return f ? f.free : true
}
