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

  const connectWs = useCallback(async (taskId: number) => {
    if (wsRefs.current.has(taskId)) return

    const ticket = await getWSTicket()
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/api/v1/admin/tasks/${taskId}/logs?token=${encodeURIComponent(ticket)}`

    const ws = new WebSocket(wsUrl)
    wsRefs.current.set(taskId, ws)

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? updateTaskEntry(t, { wsStatus: "connecting" }) : t,
      ),
    )

    ws.onopen = () => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? updateTaskEntry(t, { wsStatus: "connected" }) : t,
        ),
      )
    }

    ws.onmessage = (e) => {
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

    const handleWsEnd = () => {
      wsRefs.current.delete(taskId)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? updateTaskEntry(t, { wsStatus: "closed" }) : t,
        ),
      )
      fetchActiveTasks()
    }

    ws.onclose = handleWsEnd
    ws.onerror = handleWsEnd
  }, [fetchActiveTasks])

  useEffect(() => {
    for (const t of tasks) {
      if (
        (t.status === "pending" || t.status === "running") &&
        t.wsStatus === "idle"
      ) {
        void connectWs(t.id)
      }
    }
  }, [tasks, connectWs])

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

  const fetchTaskLogs = useCallback(async (taskId: number) => {
    try {
      const { data: res } = await getAdminTasksByIdHistory({
        path: { id: taskId },
      })
      const logs = (res?.data as string[] | undefined) ?? []
      if (logs.length > 0) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? updateTaskEntry(t, { logs, wsStatus: "closed" })
              : t,
          ),
        )
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (selectedTaskId == null) return
    const task = tasks.find((t) => t.id === selectedTaskId)
    if (
      task &&
      (task.status === "completed" || task.status === "failed") &&
      task.logs.length === 0 &&
      task.wsStatus === "idle"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 选中已完成任务时加载日志
      void fetchTaskLogs(selectedTaskId)
    }
  }, [selectedTaskId, tasks, fetchTaskLogs])

  const addTask = useCallback(
    (taskId: number, type: string) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === taskId)) return prev
        return [
          {
            id: taskId,
            type,
            status: "pending",
            created_at: new Date().toISOString(),
            logs: [],
            wsStatus: "idle",
          },
          ...prev,
        ]
      })
      setSelectedTaskId(taskId)
      setTimeout(fetchActiveTasks, 1000)
    },
    [fetchActiveTasks],
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
