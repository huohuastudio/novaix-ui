import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { getPortalTasks, getPortalEvents } from "@/api"
import type { PortalPortalTaskItem } from "@/api"
import { taskTypeLabel } from "@/lib/task-constants"
import { isAuthenticated, isImpersonating } from "@/lib/auth"
import { toast } from "sonner"

export interface PortalTask {
  id: number
  type: string
  status: string
  instance_id?: number
  result?: string
  created_at: string
  started_at?: string
  finished_at?: string
}

interface PortalTaskContextValue {
  tasks: PortalTask[]
  activeTasks: PortalTask[]
  addTask: (taskId: number, type: string, instanceId?: number) => void
}

const PortalTaskContext = createContext<PortalTaskContextValue | null>(null)

function toPortalTask(t: PortalPortalTaskItem): PortalTask {
  return {
    id: t.id!,
    type: t.type ?? "",
    status: t.status ?? "",
    instance_id: t.instance_id,
    result: t.result,
    created_at: t.created_at ?? "",
    started_at: t.started_at,
    finished_at: t.finished_at,
  }
}

interface TaskEvent {
  task_id: number
  type: string
  instance_id?: number
  status: string
  result?: string
}

// 实例变更回调注册，供实例页面订阅"某实例的任务完成"来刷新数据
type InstanceChangeCallback = (instanceId: number) => void
const instanceChangeCallbacks = new Set<InstanceChangeCallback>()

// eslint-disable-next-line react-refresh/only-export-components
export function onPortalInstanceChange(cb: InstanceChangeCallback): () => void {
  instanceChangeCallbacks.add(cb)
  return () => instanceChangeCallbacks.delete(cb)
}

function notifyInstanceChange(instanceId: number) {
  instanceChangeCallbacks.forEach((cb) => cb(instanceId))
}

export function PortalTaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<PortalTask[]>([])


  const fetchTasks = useCallback(async () => {
    try {
      const { data: res } = await getPortalTasks()
      const items = (res?.data as PortalPortalTaskItem[] | undefined) ?? []
      setTasks(items.map(toPortalTask))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载任务列表
    fetchTasks()
  }, [fetchTasks])

  const handleTaskEvent = useCallback((event: TaskEvent) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === event.task_id)
      const existing = idx >= 0 ? prev[idx] : undefined
      const now = new Date().toISOString()
      const updated: PortalTask = {
        id: event.task_id,
        type: event.type,
        status: event.status,
        instance_id: event.instance_id,
        result: event.result,
        created_at: existing?.created_at ?? now,
        started_at: event.status === "running" ? now : existing?.started_at,
        finished_at: (event.status === "completed" || event.status === "failed") ? now : existing?.finished_at,
      }

      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [updated, ...prev].slice(0, 20)
    })

    // 任何带 instance_id 的事件都刷新对应实例（含 pending/running，覆盖多标签页/后台任务场景）
    if (event.instance_id) notifyInstanceChange(event.instance_id)

    const label = taskTypeLabel(event.type)
    if (event.status === "completed") {
      toast.success(`${label}完成`)
    } else if (event.status === "failed") {
      toast.error(`${label}失败${event.result ? `：${event.result}` : ""}`)
    }
  }, [])

  // SSE 连接（使用 fetch 方式，支持 Authorization header）
  useEffect(() => {
    if (!isAuthenticated()) return

    const controller = new AbortController()
    let retryCount = 0

    const connect = async () => {
      try {
        const token = isImpersonating()
          ? sessionStorage.getItem("token")
          : localStorage.getItem("token")
        const result = await getPortalEvents({
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          onSseEvent: (event) => {
            retryCount = 0
            if (event.event === "task" && event.data) {
              handleTaskEvent(event.data as unknown as TaskEvent)
            }
          },
          onSseError: () => {
            fetchTasks()
          },
          sseMaxRetryAttempts: undefined,
          sseDefaultRetryDelay: 5000,
          sseMaxRetryDelay: 30000,
        })
        // 消费 stream 以保持连接
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of result.stream) {
          // 事件已在 onSseEvent 中处理
        }
      } catch {
        // 连接结束或被中止
        if (!controller.signal.aborted) {
          retryCount++
          const delay = Math.min(5000 * 2 ** retryCount, 30000)
          setTimeout(connect, delay)
        }
      }
    }

    connect()

    return () => controller.abort()
  }, [handleTaskEvent, fetchTasks])

  const addTask = useCallback((taskId: number, type: string, instanceId?: number) => {
    setTasks((prev) => {
      if (prev.some((t) => t.id === taskId)) return prev
      return [{
        id: taskId,
        type,
        status: "pending",
        instance_id: instanceId,
        created_at: new Date().toISOString(),
      }, ...prev].slice(0, 20)
    })
  }, [])

  const activeTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "running",
  )

  return (
    <PortalTaskContext.Provider value={{ tasks, activeTasks, addTask }}>
      {children}
    </PortalTaskContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortalTasks() {
  const ctx = useContext(PortalTaskContext)
  if (!ctx) throw new Error("usePortalTasks must be used within PortalTaskProvider")
  return ctx
}
