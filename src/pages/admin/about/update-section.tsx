import { useState } from "react"
import { RefreshCw, Download, CheckCircle2, Loader2, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAdminSystemUpdateCheck, postAdminSystemUpdate } from "@/api"
import type { ServiceUpdateCheckResult } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import Markdown from "react-markdown"
import { useTasks } from "@/hooks/use-tasks"
import { useSettings } from "@/hooks/use-settings"
import { toast } from "sonner"
import type { AxiosError } from "axios"

function getErrorMessage(err: unknown, fallback: string): string {
  const data = (err as AxiosError<{ message?: string }>)?.response?.data
  return data?.message || fallback
}

export function UpdateSection({ locked = false, bypassKey = '' }: { locked?: boolean; bypassKey?: string }) {
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [result, setResult] = useState<ServiceUpdateCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const { addTask } = useTasks()
  const { data: settings, loading: settingsLoading, save: saveSettings, update: updateSetting } = useSettings("advanced")

  const handleCheck = async () => {
    setChecking(true)
    setError(null)
    try {
      const { data: res } = await getAdminSystemUpdateCheck(bypassKey ? { query: { bypass_key: bypassKey } as never } : undefined)
      if (res?.code === 0 && res.data) {
        setResult(res.data)
      } else {
        setError(res?.message ?? "检查更新失败")
      }
    } catch (err) {
      setError(getErrorMessage(err, "检查更新失败，请检查网络连接"))
    } finally {
      setChecking(false)
    }
  }

  const handleUpdate = async () => {
    if (!result?.latest_version) return
    setUpdating(true)
    try {
      const { data: res } = await postAdminSystemUpdate({
        body: { version: result.latest_version },
        ...(bypassKey ? { query: { bypass_key: bypassKey } as never } : {}),
      })
      if (res?.code === 0 && res.data?.task_id) {
        addTask(res.data.task_id, "system_update")
        toast.success("更新任务已创建，请在任务面板查看进度")
      } else {
        toast.error(res?.message ?? "创建更新任务失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建更新任务失败"))
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <section>
      <h3 className="text-base font-medium">系统更新</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        检查并安装最新版本
      </p>

      <div className="mt-4 max-w-2xl space-y-4">
        {!settingsLoading && (
          <div className="space-y-2">
            <Label htmlFor="update_channel">更新通道</Label>
            <Select
              value={settings.update_channel || "stable"}
              onValueChange={async (v) => {
                const prev = settings.update_channel || "stable"
                updateSetting("update_channel", v)
                setResult(null)
                const ok = await saveSettings({ update_channel: v })
                if (!ok) updateSetting("update_channel", prev)
              }}
            >
              <SelectTrigger id="update_channel" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">稳定版</SelectItem>
                <SelectItem value="dev">开发版</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择「开发版」可获取尚在测试中的新版本，可能包含未完善的功能或已知问题
            </p>
          </div>
        )}

        {locked && (
          <p className="text-sm text-muted-foreground">演示模式下系统更新已锁定</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {result && (
          <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
            <span className="text-muted-foreground">当前版本</span>
            <span className="font-mono">{result.current_version}</span>
            <span className="text-muted-foreground">最新版本</span>
            <span className="font-mono inline-flex items-center gap-2">
              {result.latest_version}
              {result.is_pre_release && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <FlaskConical className="size-3" />
                  开发版
                </Badge>
              )}
            </span>
            {result.has_update && (
              <>
                <span className="text-muted-foreground">发布时间</span>
                <span>{formatDate(result.published_at)}</span>
              </>
            )}
          </div>
        )}

        {result && !result.has_update && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-500" />
            当前已是最新版本
          </div>
        )}

        {result?.has_update && result.release_notes && (
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {notesOpen ? "收起" : "查看"}更新说明
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-md border p-3 text-sm markdown-body">
                <Markdown>{result.release_notes}</Markdown>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCheck}
            disabled={checking || locked}
          >
            {checking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            检查更新
          </Button>

          {result?.has_update && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={updating || locked}>
                  {updating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  立即更新
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认更新</AlertDialogTitle>
                  <AlertDialogDescription>
                    系统将更新到版本 {result.latest_version}。更新过程中服务将重启，所有正在进行的操作可能中断。确定继续？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUpdate}>
                    确认更新
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </section>
  )
}
