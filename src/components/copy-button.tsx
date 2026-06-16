import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { Button } from "@/components/ui/button"

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()

  const handleCopy = () => {
    copyToClipboard(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="icon" className={className ?? "size-6"} onClick={handleCopy}>
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </Button>
  )
}
