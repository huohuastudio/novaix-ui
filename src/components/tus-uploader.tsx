import { useCallback, useEffect, useRef, useState } from "react"
import * as tus from "tus-js-client"
import { Pause, Play, CheckCircle2 } from "lucide-react"
import { formatBytes } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TusUploaderProps {
  endpoint: string
  file: File
  metadata?: Record<string, string>
  onSuccess?: (upload: tus.Upload) => void
  onError?: (error: Error) => void
}

type UploadState = "uploading" | "paused" | "complete" | "error"

export function TusUploader({ endpoint, file, metadata, onSuccess, onError }: TusUploaderProps) {
  const [state, setState] = useState<UploadState>("uploading")
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const uploadRef = useRef<tus.Upload | null>(null)
  const startedRef = useRef(false)


  const startUpload = useCallback(() => {
    const token = localStorage.getItem("token")
    const upload = new tus.Upload(file, {
      endpoint,
      chunkSize: 10 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      metadata: {
        filename: file.name,
        filetype: file.type || "application/octet-stream",
        ...metadata,
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        setProgress(Math.round((bytesUploaded / bytesTotal) * 100))
      },
      onSuccess: () => {
        setState("complete")
        onSuccess?.(upload)
      },
      onError: (err) => {
        setState("error")
        setErrorMsg(err.message || "上传失败")
        onError?.(err)
      },
    })

    upload.findPreviousUploads().then((prev) => {
      if (prev.length > 0) {
        upload.resumeFromPreviousUpload(prev[0])
      }
      upload.start()
    })

    uploadRef.current = upload
  }, [endpoint, file, metadata, onSuccess, onError])

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      startUpload()
    }
    return () => {
      uploadRef.current?.abort()
    }
  }, [startUpload])

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
        <div className="flex items-center gap-1">
          {state === "uploading" && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => { uploadRef.current?.abort(); setState("paused") }}>
              <Pause className="size-4" />
            </Button>
          )}
          {state === "paused" && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => { uploadRef.current?.start(); setState("uploading") }}>
              <Play className="size-4" />
            </Button>
          )}
          {state === "complete" && (
            <CheckCircle2 className="size-5 text-emerald-500" />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-300 ${state === "error" ? "bg-destructive" : state === "complete" ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            {state === "uploading" && "上传中..."}
            {state === "paused" && "已暂停"}
            {state === "complete" && "上传完成"}
            {state === "error" && errorMsg}
          </span>
          <span className="shrink-0">{progress}%</span>
        </div>
      </div>

      {state === "error" && (
        <Button variant="outline" onClick={() => { uploadRef.current?.start(); setState("uploading") }}>
          重试
        </Button>
      )}
    </div>
  )
}
