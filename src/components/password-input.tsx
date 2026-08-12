import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, RefreshCw } from "lucide-react"

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggleShow: () => void
  onGenerate?: () => void
  placeholder?: string
}

export function PasswordInput({ value, onChange, show, onToggleShow, onGenerate, placeholder = "至少 8 个字符" }: PasswordInputProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="pr-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onToggleShow}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {onGenerate && (
        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={onGenerate}>
          <RefreshCw className="size-4" />
        </Button>
      )}
    </div>
  )
}
