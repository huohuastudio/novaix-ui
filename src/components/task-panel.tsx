import { useEffect, useRef, useState, useCallback } from "react"
import {
  ListTodoIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTasks, taskTypeLabel } from "@/hooks/use-tasks"
import type { TaskEntry } from "@/hooks/use-tasks"
import { taskStatusLabel, taskStatusMap } from "@/lib/task-constants"
import { useMediaQuery } from "@uidotdev/usehooks"

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2Icon className="size-3.5 text-green-500" />
    case "failed":
      return <XCircleIcon className="size-3.5 text-red-500" />
    case "running":
      return <Spinner size="sm" className="text-blue-500" />
    default:
      return <ClockIcon className="size-3.5 text-muted-foreground" />
  }
}

function statusVariant(status: string) {
  return taskStatusMap[status]?.variant ?? "outline"
}

function TaskLogView({ task, className }: { task: TaskEntry; className?: string }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [task.logs])

  const lineColor = (text: string) => {
    if (text.startsWith(">>> ")) return "text-cyan-400"
    if (text.startsWith("错误:") || text.startsWith("Error:"))
      return "text-red-400"
    return "text-zinc-400"
  }

  return (
    <div className={cn("bg-zinc-950 rounded border border-zinc-800 overflow-y-auto p-2 font-mono text-[11px] leading-snug", className)}>
      {task.logs.length === 0 && task.wsStatus !== "closed" && (
        <div className="text-zinc-600">等待日志...</div>
      )}
      {task.logs.map((line, i) => (
        <div key={i} className={cn("break-all", lineColor(line))}>
          {line}
        </div>
      ))}
      {task.status === "failed" && task.result && task.logs.length === 0 && (
        <div className="text-red-400">{task.result}</div>
      )}
      {task.wsStatus === "closed" && (
        <div className="text-zinc-600 mt-1">--- 结束 ---</div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}

function TaskDetailHeader({ task, onBack }: { task: TaskEntry; onBack?: () => void }) {
  return (
    <div className="px-3 h-9 border-b flex items-center gap-2 shrink-0">
      {onBack && (
        <button
          type="button"
          className="p-0.5 -ml-1 hover:bg-muted rounded cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-3.5" />
        </button>
      )}
      <StatusIcon status={task.status} />
      <span className="text-xs font-medium truncate flex-1">
        {taskTypeLabel(task.type)} #{task.id}
      </span>
      <Badge
        variant={statusVariant(task.status)}
        className="text-[10px] shrink-0"
      >
        {taskStatusLabel(task.status)}
      </Badge>
    </div>
  )
}

function TaskList({
  tasks,
  selectedTaskId,
  onSelect,
  activeCount,
  finishedCount,
  onClear,
}: {
  tasks: TaskEntry[]
  selectedTaskId: number | null
  onSelect: (id: number | null) => void
  activeCount: number
  finishedCount: number
  onClear: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleClear = useCallback(() => {
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => setConfirming(false), 3000)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    setConfirming(false)
    onClear()
  }, [confirming, onClear])

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 h-9 border-b flex items-center justify-between shrink-0">
        <span className="text-xs font-medium">任务</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {tasks.length === 0
              ? "暂无"
              : activeCount > 0
                ? `${activeCount} 个进行中`
                : "全部完成"}
          </span>
          {finishedCount > 0 && (
            <button
              type="button"
              className={cn(
                "text-[11px] transition-colors cursor-pointer",
                confirming ? "text-destructive font-medium" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={handleClear}
            >
              {confirming ? "确认清空?" : "清空"}
            </button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground">
          暂无任务
        </div>
      ) : (
        <div className="overflow-y-auto min-h-0 flex-1">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/50 cursor-pointer border-b last:border-b-0",
                selectedTaskId === t.id && "bg-muted",
              )}
              onClick={() =>
                onSelect(selectedTaskId === t.id ? null : t.id)
              }
            >
              <StatusIcon status={t.status} />
              <span className="flex-1 min-w-0 text-xs truncate">
                {taskTypeLabel(t.type)}
                <span className="text-muted-foreground ml-1">#{t.id}</span>
              </span>
              <Badge
                variant={statusVariant(t.status)}
                className="text-[10px] shrink-0"
              >
                {taskStatusLabel(t.status)}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskTrigger() {
  const { tasks, selectedTaskId, setSelectedTaskId, clearFinished } = useTasks()
  const isDesktop = useMediaQuery("(min-width: 640px)")

  const activeCount = tasks.filter(
    (t) => t.status === "pending" || t.status === "running",
  ).length
  const finishedCount = tasks.length - activeCount

  const selectedTask = tasks.find((t) => t.id === selectedTaskId)
  const showDetail = !!selectedTask

  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative">
              <ListTodoIcon className="size-4" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent>任务列表</TooltipContent>}
      </Tooltip>
      <PopoverContent
        align="end"
        collisionPadding={8}
        style={{ maxHeight: "min(480px, var(--radix-popper-available-height))" }}
        className={cn(
          "p-0 overflow-hidden flex flex-col",
          showDetail && isDesktop ? "w-[560px]" : "w-72",
        )}
      >
        {isDesktop ? (
          <div className="flex min-h-0 flex-1">
            {showDetail && (
              <div className="w-[280px] border-r flex flex-col shrink-0 min-h-0">
                <TaskDetailHeader task={selectedTask} />
                <div className="flex-1 min-h-0">
                  <TaskLogView task={selectedTask} className="h-full rounded-none border-0" />
                </div>
              </div>
            )}
            <div className={cn("flex-1 min-w-0 min-h-0", showDetail ? "w-[280px]" : "w-72")}>
              <TaskList
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelect={setSelectedTaskId}
                activeCount={activeCount}
                finishedCount={finishedCount}
                onClear={clearFinished}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            {showDetail ? (
              <>
                <TaskDetailHeader
                  task={selectedTask}
                  onBack={() => setSelectedTaskId(null)}
                />
                <div className="flex-1 min-h-0">
                  <TaskLogView task={selectedTask} className="h-full rounded-none border-0" />
                </div>
              </>
            ) : (
              <TaskList
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelect={setSelectedTaskId}
                activeCount={activeCount}
                finishedCount={finishedCount}
                onClear={clearFinished}
              />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
