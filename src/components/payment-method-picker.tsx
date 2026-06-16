import { cn } from "@/lib/utils"
import { BrandIcon } from "@/components/brand-icon"
import { methodKey } from "@/lib/payment"
import type { PortalPaymentMethodItem } from "@/api"

export function PaymentMethodGrid({
  methods,
  selectedProvider,
  selectedMethod,
  onSelect,
}: {
  methods: PortalPaymentMethodItem[]
  selectedProvider: string
  selectedMethod: string
  onSelect: (provider: string, method: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {methods.map((m) => {
        const key = methodKey(m)
        const isSelected = selectedProvider === (m.provider ?? "") && selectedMethod === (m.method ?? "")
        return (
          <button
            key={key}
            type="button"
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:bg-accent"
            )}
            onClick={() => onSelect(m.provider ?? "", m.method ?? "")}
          >
            <BrandIcon name={m.method || m.provider || ""} size={16} />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
