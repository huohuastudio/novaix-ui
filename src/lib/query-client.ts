import { QueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"

// 全局唯一的 QueryClient 实例。
// 错误处理分工：401 重定向、403 提示、503 维护态均由 lib/api-client.ts 的 axios
// 响应拦截器按「每次 HTTP 请求」处理，因此 4xx 一律不重试——若改为重试，
// 401 会触发多次重定向、403 会弹出重复提示。此约束不可放宽。
// 这里不注册全局 QueryCache/MutationCache onError，避免与拦截器的 toast 双重提示；
// 查询错误照常流入各页面的 error 渲染，写操作错误由页面级 toast 处理。
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 管理后台场景：30 秒内返回列表/详情页直接吃缓存秒开，后台自动刷新兜底
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // 后台系统切窗频繁，避免意外整页刷新；需要的页面单独开启
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status && status >= 400 && status < 500) return false
        }
        // 网络错误 / 5xx 重试 1 次
        return failureCount < 1
      },
    },
    mutations: { retry: false },
  },
})
