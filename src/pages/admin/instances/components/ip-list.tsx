import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2, Globe, Network } from "lucide-react"
import { toast } from "sonner"
import { deleteAdminInstancesByIdIpsByIpId } from "@/api"
import type { InstanceIpItem } from "@/api"
import {
  getAdminInstancesByIdIpsOptions,
  getAdminInstancesByIdIpsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { getErrorMessage } from "@/lib/utils"
import { useTasks } from "@/hooks/use-tasks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function AdminIpList({ instanceId, onRefresh }: { instanceId: number; onRefresh: () => void }) {
  const queryClient = useQueryClient()
  const [removeConfirm, setRemoveConfirm] = useState<InstanceIpItem | null>(null)
  const [removing, setRemoving] = useState(false)
  const { addTask } = useTasks()
  // instanceId 通过 path 进入 queryKey
  const ipsQuery = useQuery({
    ...getAdminInstancesByIdIpsOptions({ path: { id: instanceId } }),
    select: (res) => res?.data,
  })
  // 查询未完成时 data 为 undefined，此处统一兜底为空数组
  const ips = ipsQuery.data ?? []
  const loading = ipsQuery.isPending
  // 移除 IP 后刷新 IP 列表缓存
  const fetchIps = () => {
    queryClient.invalidateQueries({
      queryKey: getAdminInstancesByIdIpsQueryKey({ path: { id: instanceId } }),
    })
  }
  const handleRemove = async () => {
    if (!removeConfirm?.id) return
    setRemoving(true)
    try {
      const { data: res } = await deleteAdminInstancesByIdIpsByIpId({
        path: { id: instanceId, ipId: removeConfirm.id! },
      })
      if (res?.code === 0) {
        const taskId = res.data?.task_id
        if (taskId) addTask(taskId, "remove_ip")
        toast.success("IP 已移除")
        setRemoveConfirm(null)
        fetchIps()
        onRefresh()
      } else {
        toast.error(res?.message || "移除 IP 失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "移除 IP 失败"))
    } finally {
      setRemoving(false)
    }
  }
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    )
  }
  if (ips.length === 0) {
    return <EmptyState icon={Network} title="暂无 IP 地址" />
  }
  return (
    <>
      <div className="space-y-2">
        {ips.map((ip) => (
          <div
            key={ip.id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Globe className="size-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium font-mono text-sm">{ip.address}</span>
                  {ip.is_primary && (
                    <Badge variant="secondary" className="text-[10px]">主 IP</Badge>
                  )}
                </div>
                {ip.pool_name && (
                  <div className="text-xs text-muted-foreground mt-0.5">{ip.pool_name}</div>
                )}
              </div>
            </div>
            {!ip.is_primary && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setRemoveConfirm(ip)}
              >
                <Trash2 className="size-4" />
                移除
              </Button>
            )}
          </div>
        ))}
      </div>
      <AlertDialog open={removeConfirm !== null} onOpenChange={(open) => { if (!open) setRemoveConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除 IP</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从该实例移除 IP 地址 <span className="font-mono font-medium">{removeConfirm?.address}</span> 吗？IP 将回归空闲池。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing && <Spinner />}
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
