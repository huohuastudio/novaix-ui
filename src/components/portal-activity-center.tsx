import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Activity, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { usePortalTasks } from "@/hooks/use-portal-tasks"
import { taskTypeLabel } from "@/lib/task-constants"

function formatDuration(start?: string, end?: string): string {
  if (!start || !end) return ""
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return "<1s"
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m${s % 60}s`
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Check className="size-3.5 text-emerald-500" />
    case "failed":
      return <X className="size-3.5 text-red-500" />
    case "pending":
    case "running":
      return <Loader2 className="size-3.5 text-amber-500 animate-spin" />
    default:
      return null
  }
}

export function PortalActivityCenter() {
  const { tasks, activeTasks } = usePortalTasks()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const activeCount = activeTasks.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Activity className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2.5 border-b">
          <p className="text-sm font-medium">最近操作</p>
        </div>
        {tasks.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            暂无操作记录
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {tasks.map((task) => {
              const isActive = task.status === "pending" || task.status === "running"
              return (
                <button
                  key={task.id}
                  className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left hover:bg-accent/50 transition-colors border-b last:border-b-0"
                  onClick={() => {
                    if (task.instance_id) {
                      navigate(`/portal/servers/${task.instance_id}`)
                      setOpen(false)
                    }
                  }}
                  disabled={!task.instance_id}
                >
                  <div className="mt-0.5 shrink-0">
                    <StatusIcon status={task.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {taskTypeLabel(task.type)}
                    </p>
                    {task.status === "failed" && task.result && (
                      <p className="text-xs text-red-500 truncate mt-0.5">
                        {task.result}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(task.created_at)}
                      </span>
                      {!isActive && task.started_at && task.finished_at && (
                        <span className="text-xs text-muted-foreground">
                          · {formatDuration(task.started_at, task.finished_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
