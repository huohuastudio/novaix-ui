import { useState, type ReactNode } from "react"
import { Copy, Check, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RevealOnceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  value: string
  warning?: string
}

// 用于一次性展示敏感凭证（API 明文密钥、callback_secret 等）。
// 提醒用户立即复制保存，关闭后不可再次查看。
export function RevealOnceDialog({
  open,
  onOpenChange,
  title,
  description,
  value,
  warning = "关闭此对话框后将无法再次查看，请立即复制保存",
}: RevealOnceDialogProps) {
  const [copied, setCopied] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()

  const handleCopy = () => {
    copyToClipboard(value)
    setCopied(true)
    toast.success("已复制到剪贴板")
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Alert variant="warning">
            <AlertTriangle />
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
          <div className="flex items-center gap-2">
            <Input value={value} readOnly className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>我已保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
