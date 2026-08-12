import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { isAuthenticated } from "@/lib/auth"
import {
  getAdminImagesQueryKey,
  getAdminInstancesQueryKey,
  getAdminInstancesByIdQueryKey,
  getAdminNodesQueryKey,
  getAdminTasksQueryKey,
  getAdminTasksActiveQueryKey,
  getAdminTasksStatsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { queryKeys } from "@/lib/query-keys"

interface AdminTaskEvent {
  task_id: number
  type: string
  instance_id?: number
  status: string
  result?: string
}

// 管理端任务变更回调，供页面订阅刷新
type AdminChangeCallback = (event: AdminTaskEvent) => void
const adminChangeCallbacks = new Set<AdminChangeCallback>()

/**
 * 注册管理端任务变更回调，返回取消注册函数。
 * 供页面级组件订阅特定任务完成后的刷新动作。
 */
export function onAdminTaskChange(cb: AdminChangeCallback): () => void {
  adminChangeCallbacks.add(cb)
  return () => adminChangeCallbacks.delete(cb)
}

/**
 * 管理端 SSE 事件订阅 hook。
 * 连接到 /api/v1/admin/events，接收所有任务状态变更事件，
 * 自动刷新相关的 TanStack Query 缓存。
 */
export function useAdminEvents() {
  const queryClient = useQueryClient()

  const handleTaskEvent = useCallback(
    (event: AdminTaskEvent) => {
      // 通知所有回调
      adminChangeCallbacks.forEach((cb) => cb(event))

      // 任务完成或失败时刷新相关缓存
      if (event.status === "completed" || event.status === "failed" || event.status === "compensation_failed") {
        // 刷新实例和节点列表
        queryClient.invalidateQueries({
          queryKey: getAdminInstancesQueryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: getAdminNodesQueryKey(),
        })
        // 如果有关联实例，刷新实例详情
        if (event.instance_id) {
          queryClient.invalidateQueries({
            queryKey: getAdminInstancesByIdQueryKey({
              path: { id: event.instance_id },
            }),
          })
        }
        // 镜像相关任务完成时刷新镜像列表和引导页状态
        if (event.type === "download_image" || event.type === "distribute_image" || event.type === "pull_node_image") {
          queryClient.invalidateQueries({
            queryKey: getAdminImagesQueryKey(),
          })
          queryClient.invalidateQueries({
            queryKey: queryKeys.setupGuideStatus(),
          })
        }
        // 刷新任务相关缓存
        queryClient.invalidateQueries({
          queryKey: getAdminTasksQueryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: getAdminTasksActiveQueryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: getAdminTasksStatsQueryKey(),
        })
      }
    },
    [queryClient],
  )

  useEffect(() => {
    if (!isAuthenticated()) return

    const controller = new AbortController()
    let retryCount = 0

    const connect = () => {
      const token = localStorage.getItem("token")
      const baseUrl = `${window.location.origin}/api/v1/admin/events`

      fetch(baseUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok || !response.body) {
            throw new Error(`SSE 连接失败: ${response.status}`)
          }

          retryCount = 0
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ""

          const read = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) {
                if (!controller.signal.aborted) {
                  retryCount++
                  const delay = Math.min(5000 * 2 ** retryCount, 30000)
                  setTimeout(connect, delay)
                }
                return
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() ?? ""

              let eventName = ""
              let eventData = ""

              for (const line of lines) {
                if (line.startsWith("event:")) {
                  eventName = line.slice(6).trim()
                } else if (line.startsWith("data:")) {
                  eventData = line.slice(5).trim()
                } else if (line === "" && eventName && eventData) {
                  // 空行表示事件结束
                  if (eventName === "task") {
                    try {
                      const parsed = JSON.parse(
                        eventData,
                      ) as AdminTaskEvent
                      handleTaskEvent(parsed)
                    } catch {
                      // 解析失败忽略
                    }
                  }
                  eventName = ""
                  eventData = ""
                }
              }

              return read()
            })

          return read()
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            retryCount++
            const delay = Math.min(5000 * 2 ** retryCount, 30000)
            setTimeout(connect, delay)
          }
        })
    }

    connect()

    return () => controller.abort()
  }, [handleTaskEvent])
}
