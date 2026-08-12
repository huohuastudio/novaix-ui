import { useState } from "react"
import { Megaphone, Loader2 } from "lucide-react"
import { postAdminNotificationsBroadcast } from "@/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// 广播通知对话框，用于向所有用户发送系统通知
export function BroadcastDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = (v: boolean) => {
    if (submitting) return
    setOpen(v)
    if (!v) {
      // 关闭时重置表单
      setTitle("")
      setContent("")
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      await postAdminNotificationsBroadcast({
        body: { title: title.trim(), content: content.trim() },
      })
      toast.success("广播通知已发送")
      handleOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, "发送失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Megaphone className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>广播通知</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>广播通知</DialogTitle>
          <DialogDescription>向所有用户发送系统通知</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-title">标题</Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入通知标题"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast-content">内容</Label>
            <Textarea
              id="broadcast-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入通知内容"
              rows={4}
              disabled={submitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            发送
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
