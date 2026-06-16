import { useState } from "react"
import { useDemoMode, useAdminPath } from "@/hooks/use-site-settings"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function DemoDialog() {
  const isDemo = useDemoMode()
  const adminPath = useAdminPath()
  const [open, setOpen] = useState(() =>
    isDemo && sessionStorage.getItem("demo_dialog_dismissed") !== "true"
  )

  if (!isDemo) return null

  function handleClose() {
    sessionStorage.setItem("demo_dialog_dismissed", "true")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-lg">欢迎体验 Novaix 演示环境</DialogTitle>
          <DialogDescription>
            当前为产品演示模式，所有数据会定期自动重置。您可以自由操作体验所有功能。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 space-y-1">
            <p className="text-sm font-medium">管理后台</p>
            <div className="text-sm text-muted-foreground grid grid-cols-[4rem_1fr] gap-y-0.5">
              <span>账号</span>
              <span className="font-mono">admin</span>
              <span>密码</span>
              <span className="font-mono">demo123</span>
              <span>入口</span>
              <a href={`${adminPath}/login`} className="text-primary hover:underline">{adminPath}/login</a>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-1">
            <p className="text-sm font-medium">用户前台</p>
            <div className="text-sm text-muted-foreground grid grid-cols-[4rem_1fr] gap-y-0.5">
              <span>账号</span>
              <span className="font-mono">bob</span>
              <span>密码</span>
              <span className="font-mono">demo123</span>
              <span>入口</span>
              <a href="/login" className="text-primary hover:underline">/login</a>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          如有任何问题或建议，欢迎到{" "}
          <a
            href="https://github.com/huohuastudio/novaix-releases/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub Issues
          </a>
          {" "}反馈。
        </p>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">开始体验</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
