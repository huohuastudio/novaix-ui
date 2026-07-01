import { useCallback, useRef, useState } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { postAdminUpload } from "@/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ImageUploadFieldProps {
  value?: string
  onChange: (url: string) => void
  onUploaded?: (file: File, url: string) => void
  accept?: string
  className?: string
  placeholder?: string
}

export function ImageUploadField({
  value,
  onChange,
  onUploaded,
  accept = "image/jpeg,image/png,image/gif,image/webp,image/x-icon",
  className,
  placeholder = "输入图片 URL 或点击上传",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File) => {
    setError("")
    setUploading(true)
    try {
      const { data: res } = await postAdminUpload({ body: { file } })
      if (res?.code === 0 && res.data?.url) {
        onChange(res.data.url)
        onUploaded?.(file, res.data.url)
      } else {
        setError(res?.message || "上传失败")
      }
    } catch {
      setError("上传失败，请重试")
    } finally {
      setUploading(false)
    }
  }, [onChange, onUploaded])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ""
  }, [handleUpload])

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={value ?? ""}
          onChange={(e) => { setError(""); onChange(e.target.value) }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange("")}
          >
            <X className="size-4" />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {value && /\.(jpe?g|png|gif|webp|ico)$/i.test(value) && (
        <img
          src={value}
          alt="预览"
          className="h-20 rounded-md border object-contain"
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
