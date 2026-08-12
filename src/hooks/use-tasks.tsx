import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { getAdminTasksActive, getAdminTasksByIdHistory, deleteAdminTasksFinished } from "@/api"
import type { TaskTaskItem } from "@/api"
import { getWSTicket } from "@/lib/ws-ticket"
import { taskTypeLabel } from "@/lib/task-constants"
import { onAdminTaskChange } from "@/hooks/use-admin-events"

// eslint-disable-next-line react-refresh/only-export-components
export { taskTypeLabel }

export interface TaskEntry {
  id: number
  type: string
  status: string
  result?: string
  node_id?: number
  instance_id?: number
  created_at: string
  finished_at?: string
  logs: string[]
  wsStatus: "idle" | "connecting" | "connected" | "closed"
}

interface TaskContextValue {
  tasks: TaskEntry[]
  selectedTaskId: number | null
  setSelectedTaskId: (id: number | null) => void
  addTask: (taskId: number, type: string) => void
  addTasks: (items: Array<{ id: number; type: string }>) => void
  clearFinished: () => void
  refreshTasks: () => void
}

const TaskContext = createContext<TaskContextValue | null>(null)

function updateTaskEntry(task: TaskEntry, field: Partial<TaskEntry>): TaskEntry {
  return { ...task, ...field }
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<TaskEntry[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const wsRefs = useRef<Map<number, WebSocket>>(new Map())
  const logsFetchedRef = useRef<Set<number>>(new Set())

  const fetchActiveTasks = useCallback(async () => {
    try {
      const { data: res } = await getAdminTasksActive()
      const serverTasks = (res?.data as TaskTaskItem[] | undefined) ?? []

      setTasks((prev) => {
        const merged = new Map<number, TaskEntry>()
        for (const t of prev) merged.set(t.id, t)
        for (const t of serverTasks) {
          const id = t.id!
          const existing = merged.get(id)
          merged.set(id, {
            id,
            type: t.type ?? "",
            status: t.status ?? "",
            result: t.result,
            node_id: t.node_id,
            instance_id: t.instance_id,
            created_at: t.created_at ?? "",
            finished_at: t.finished_at,
            logs: existing?.logs ?? [],
            wsStatus: existing?.wsStatus ?? "idle",
          })
        }
        const next = Array.from(merged.values()).sort((a, b) => b.id - a.id)
        if (
          next.length === prev.length &&
          next.every(
            (t, i) =>
              t.id === prev[i].id &&
              t.status === prev[i].status &&
              t.result === prev[i].result,
          )
        )
          return prev
        return next
      })
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载活跃任务
    void fetchActiveTasks()
  }, [fetchActiveTasks])

  const fetchTaskLogs = useCallback(async (taskId: number) => {
    try {
      const { data: res } = await getAdminTasksByIdHistory({
        path: { id: taskId },
      })
      const logs = (res?.data as string[] | undefined) ?? []
      if (logs.length > 0) {
        logsFetchedRef.current.add(taskId)
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t
            if (t.logs.length > 0) return t
            return updateTaskEntry(t, { logs, wsStatus: "closed" })
          }),
        )
      }
    } catch {
      // ignore
    }
  }, [])

  const connectingRef = useRef(new Set<number>())

  const connectWs = useCallback(async (taskId: number) => {
    if (wsRefs.current.has(taskId) || connectingRef.current.has(taskId)) return
    connectingRef.current.add(taskId)

    let ticket: string
    try {
      ticket = await getWSTicket()
    } catch {
      connectingRef.current.delete(taskId)
      return
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/api/v1/admin/tasks/${taskId}/logs?token=${encodeURIComponent(ticket)}`

    const ws = new WebSocket(wsUrl)
    wsRefs.current.set(taskId, ws)
    connectingRef.current.delete(taskId)

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? updateTaskEntry(t, { wsStatus: "connecting" }) : t,
      ),
    )

    ws.onopen = () => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? updateTaskEntry(t, { wsStatus: "connected", logs: [] }) : t,
        ),
      )
    }

    let receivedMessages = false
    ws.onmessage = (e) => {
      receivedMessages = true
      const line = e.data as string
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t
          const update: Partial<TaskEntry> = { logs: [...t.logs, line] }
          if (t.status === "pending") update.status = "running"
          return updateTaskEntry(t, update)
        }),
      )
    }

    ws.onclose = (e) => {
      wsRefs.current.delete(taskId)
      if (receivedMessages) logsFetchedRef.current.add(taskId)
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t
          const isActive = t.status === "pending" || t.status === "running"
          const wsStatus = e.code !== 1000 && isActive ? "idle" : "closed"
          return updateTaskEntry(t, { wsStatus })
        }),
      )
      fetchActiveTasks()
    }
    ws.onerror = () => {}
  }, [fetchActiveTasks])

  useEffect(() => {
    const ids = tasks
      .filter((t) => (t.status === "pending" || t.status === "running") && t.wsStatus === "idle")
      .map((t) => t.id)
    if (ids.length === 0) return
    queueMicrotask(() => ids.forEach((id) => void connectWs(id)))
  }, [tasks, connectWs])

  // SSE 事件直接更新任务状态
  useEffect(() => {
    return onAdminTaskChange((event) => {
      setTasks((prev) => {
        let changed = false
        const next = prev.map((t) => {
          if (t.id !== event.task_id) return t
          changed = true
          return updateTaskEntry(t, { status: event.status, ...(event.result ? { result: event.result } : {}) })
        })
        return changed ? next : prev
      })
    })
  }, [])

  const hasActive = tasks.some(
    (t) => t.status === "pending" || t.status === "running",
  )
  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(fetchActiveTasks, 10_000)
    return () => clearInterval(id)
  }, [hasActive, fetchActiveTasks])

  useEffect(() => {
    const refs = wsRefs.current
    return () => {
      refs.forEach((ws) => ws.close())
    }
  }, [])

  useEffect(() => {
    if (selectedTaskId == null) return
    if (logsFetchedRef.current.has(selectedTaskId)) return
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (
      task &&
      (task.status === "completed" || task.status === "failed" || task.status === "compensation_failed") &&
      task.logs.length === 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 已完成任务无日志时从 DB 加载
      void fetchTaskLogs(selectedTaskId)
    }
  }, [selectedTaskId, tasks, fetchTaskLogs])

  const addTasks = useCallback(
    (items: Array<{ id: number; type: string }>) => {
      if (items.length === 0) return
      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id))
        const newEntries = items
          .filter((item) => !existingIds.has(item.id))
          .map((item) => ({
            id: item.id,
            type: item.type,
            status: "pending",
            created_at: new Date().toISOString(),
            logs: [] as string[],
            wsStatus: "idle" as const,
          }))
        if (newEntries.length === 0) return prev
        return [...newEntries, ...prev]
      })
      setSelectedTaskId(items[0].id)
      setTimeout(fetchActiveTasks, 1000)
    },
    [fetchActiveTasks],
  )

  const addTask = useCallback(
    (taskId: number, type: string) => addTasks([{ id: taskId, type }]),
    [addTasks],
  )

  const clearFinished = useCallback(async () => {
    try {
      await deleteAdminTasksFinished()
      setTasks((prev) =>
        prev.filter((t) => t.status === "pending" || t.status === "running"),
      )
      setSelectedTaskId(null)
    } catch {
      // API 失败时保留本地状态，避免与服务端不同步
    }
  }, [])

  return (
    <TaskContext.Provider
      value={{
        tasks,
        selectedTaskId,
        setSelectedTaskId,
        addTask,
        addTasks,
        clearFinished,
        refreshTasks: fetchActiveTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTasks() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error("useTasks must be used within TaskProvider")
  return ctx
}
