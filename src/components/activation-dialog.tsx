import { useState } from "react"
import { Crown, Check, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useEdition, useFeatures } from "@/hooks/use-edition"
import { postAdminSystemActivate } from "@/api"
import { getUser } from "@/lib/auth"

export function ActivationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const edition = useEdition()
  const features = useFeatures()
  const [key, setKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [activateWarning, setActivateWarning] = useState("")

  async function handleActivate() {
    if (!key.trim()) {
      toast.error("请输入激活码")
      return
    }
    setLoading(true)
    setActivateWarning("")
    try {
      const { data: res } = await postAdminSystemActivate({ body: { key: key.trim() } })
      const warning = res?.data?.warning
      if (warning) {
        setActivateWarning(warning)
      } else {
        toast.success("激活成功，页面即将刷新")
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "激活失败，请检查激活码是否正确"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>系统版本</DialogTitle>
          <DialogDescription>
            {edition === "paid"
              ? "当前为授权版，已解锁全部功能"
              : "当前为免费版，部分功能受限。输入激活码升级到授权版"}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertDescription>
            系统当前仍处于开发阶段，功能尚未经过充分的生产验证，请勿用于生产环境。
          </AlertDescription>
        </Alert>

        <div className="rounded-md border overflow-hidden text-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-3 font-medium">功能</th>
                <th className="text-center py-2 px-3 font-medium w-20">免费版</th>
                <th className="text-center py-2 px-3 font-medium w-20">授权版</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3">节点数量</td>
                <td className="text-center py-2 px-3 text-muted-foreground">≤ 2</td>
                <td className="text-center py-2 px-3 text-green-600 dark:text-green-400">不限</td>
              </tr>
              {features.map((f) => (
                <tr key={f.key} className="border-b last:border-b-0">
                  <td className="py-2 px-3">{f.label}</td>
                  <td className="text-center py-2 px-3">
                    {f.free ? (
                      <Check className="size-4 text-green-600 dark:text-green-400 mx-auto" />
                    ) : (
                      <X className="size-4 text-muted-foreground/50 mx-auto" />
                    )}
                  </td>
                  <td className="text-center py-2 px-3">
                    {f.paid ? (
                      <Check className="size-4 text-green-600 dark:text-green-400 mx-auto" />
                    ) : (
                      <X className="size-4 text-muted-foreground/50 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {edition !== "paid" && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="请输入激活码"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              />
              <Button onClick={handleActivate} disabled={loading} className="shrink-0">
                {loading && <Loader2 className="size-4 animate-spin mr-1" />}
                激活
              </Button>
            </div>
            {activateWarning && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertDescription>
                  {activateWarning}
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-2 h-auto p-0 text-destructive underline"
                    onClick={() => window.location.reload()}
                  >
                    刷新页面
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter className="sm:justify-start">
              <p className="text-xs text-muted-foreground">
                还没有激活码？前往{" "}
                <a
                  href="https://huohuastudio.com/products/novaix/buy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  订阅页面
                </a>
                {" "}获取
              </p>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ActivationTrigger() {
  const [open, setOpen] = useState(false)
  const edition = useEdition()
  const user = getUser()

  if (user?.role !== "admin" || edition === "paid") return null

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Crown
              className={`size-4 ${edition === "paid" ? "text-muted-foreground" : "text-amber-500"}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{edition === "paid" ? "已激活" : "激活授权"}</TooltipContent>
      </Tooltip>
      <ActivationDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
