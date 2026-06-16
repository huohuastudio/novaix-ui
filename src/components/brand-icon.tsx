import { getBrandMeta } from "@/lib/brand"

export function BrandIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const meta = getBrandMeta(name)
  if (!meta) return null
  const Icon = meta.icon
  return <Icon size={size} color={meta.color ?? "currentColor"} className={className} />
}
