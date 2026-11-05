import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocalStorage } from "@uidotdev/usehooks"
import { toast } from "sonner"
import { Clock, Loader2, ShieldAlert, X } from "lucide-react"
import { postAdminSystemLicenseRefresh } from "@/api"
import { getAdminSystemLicenseOptions, getAdminSystemLicenseQueryKey } from "@/api/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/hooks/use-auth"
import { useAdminPath, useFormatDate } from "@/hooks/use-site-settings"
import { cn, getErrorMessage } from "@/lib/utils"

const RENEW_URL = "https://huohuastudio.com/products/novaix/buy"

/** 授权到期提醒横幅：到期前 7 天提示续费，宽限期内提示降级日期（仅超级管理员可见） */
export function LicenseExpiryBanner() {
  const isAdmin = useIsAdmin()
  const adminPath = useAdminPath()
  const queryClient = useQueryClient()
  const formatDate = useFormatDate()
  const { data } = useQuery({
    ...getAdminSystemLicenseOptions(),
    enabled: isAdmin,
    // 到期状态由服务端按请求时间计算，长时间停留页面时定时刷新以跨过状态边界
    refetchInterval: 30 * 60 * 1000,
  })
  // 即将到期提醒可按天关闭，记录关闭当天的日期
  const [dismissedOn, setDismissedOn] = useLocalStorage("license-expiry-banner-dismissed", "")
  const [refreshing, setRefreshing] = useState(false)

  const info = data?.code === 0 ? data.data : undefined
  const status = info?.expiry_status
  if (!isAdmin || !info?.licensed || !info.expires_at || !info.downgrade_at) return null
  if (status !== "expiring" && status !== "grace") return null

  const today = new Date().toDateString()
  if (status === "expiring" && dismissedOn === today) return null

  // 横幅按站点时区显示，接口时间戳为 Unix 秒
  const fmt = (ts: number) => formatDate(new Date(ts * 1000).toISOString())
  const urgent = status === "grace"

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const { data: res } = await postAdminSystemLicenseRefresh()
      const next = res?.data
      if (!next?.licensed) {
        toast.error("授权已失效，系统已降级为免费版，页面即将刷新")
        setTimeout(() => window.location.reload(), 1500)
        return
      }
      if (next.expires_at !== info?.expires_at) {
        toast.success(next.expires_at ? `授权已续期至 ${fmt(next.expires_at)}` : "授权已续期为永久授权")
      } else {
        toast.info("暂未检测到续费，请确认续费完成后稍后再试")
      }
      // 刷新接口已返回最新授权信息，直接写入缓存，无需再次请求
      queryClient.setQueryData(getAdminSystemLicenseQueryKey(), res)
    } catch (err) {
      toast.error(getErrorMessage(err, "刷新授权失败"))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm",
        urgent
          ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {urgent ? <ShieldAlert className="size-4 shrink-0" /> : <Clock className="size-4 shrink-0" />}
        <span>
          {urgent
            ? <>授权已于 {fmt(info.expires_at)} 到期，系统将于 <strong>{fmt(info.downgrade_at)}</strong> 降级为免费版，请尽快续费</>
            : <>授权将于 <strong>{fmt(info.expires_at)}</strong> 到期，请及时续费，以免影响付费功能使用</>}
        </span>
      </div>
      <div className="flex items-center gap-3 ml-auto shrink-0">
        <a href={RENEW_URL} target="_blank" rel="noreferrer" className="font-medium underline">前往续费</a>
        <Link to={`${adminPath}/about`} className="font-medium underline">查看授权</Link>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1 font-medium underline disabled:opacity-60"
        >
          {refreshing && <Loader2 className="size-3.5 animate-spin" />}
          我已续费，立即刷新
        </button>
        {!urgent && (
          <Button variant="ghost" size="icon-sm" className="size-6 hover:bg-transparent" onClick={() => setDismissedOn(today)}>
            <X className="size-4" />
            <span className="sr-only">今日不再提示</span>
          </Button>
        )}
      </div>
    </div>
  )
}
