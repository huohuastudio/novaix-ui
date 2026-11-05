import { RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { incusErrorMessage } from "@/lib/incus"
import { getErrorMessage } from "@/lib/utils"

interface NodeQueryErrorProps {
  title: string
  error: unknown
  onRetry?: () => void
  retrying?: boolean
}

// 节点资源加载失败状态：明确区分"加载失败"与"暂无数据"，避免节点不可达时被误认为资源丢失
export function NodeQueryError({ title, error, onRetry, retrying }: NodeQueryErrorProps) {
  const detail = incusErrorMessage(error, getErrorMessage(error, ""))
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
      <p className="text-sm text-destructive">{title}</p>
      {detail && <p className="text-xs text-muted-foreground font-mono">{detail}</p>}
      <p className="text-xs text-muted-foreground">通常是节点暂时无法访问导致的，不代表节点上的资源已丢失。请检查节点网络和服务端口后重试</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry} disabled={retrying}>
          <RotateCw className={retrying ? "size-3.5 mr-1.5 animate-spin" : "size-3.5 mr-1.5"} />
          重试
        </Button>
      )}
    </div>
  )
}
