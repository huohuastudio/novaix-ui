import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { postAdminNodesByIdStoragePoolsByPoolResize } from "@/api"
import { getAdminNodesByIdStoragePoolsByPoolCapacityOptions, getAdminNodesByIdStoragePoolsByPoolCapacityQueryKey, getAdminNodesByIdQueryKey, getAdminNodesQueryKey } from "@/api/@tanstack/react-query.gen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { queryKeys } from "@/lib/query-keys"
import { formatBytes, getErrorMessage } from "@/lib/utils"

export function StoragePoolResizeDialog({ nodeId, poolName, onClose }: { nodeId: number; poolName: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [size, setSize] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const options = { path: { id: nodeId, pool: poolName } }
  const query = useQuery(getAdminNodesByIdStoragePoolsByPoolCapacityOptions(options))
  const capacity = query.data?.data
  const value = size ?? String(capacity?.recommended_size_gib ?? "")
  const target = Number(value)
  const valid = capacity?.supported && Number.isSafeInteger(target) && target * 1024 ** 3 > (capacity.current_size_bytes ?? 0) && target <= (capacity.max_size_gib ?? 0)

  async function submit() {
    if (!valid || submitting || !capacity?.current_size_bytes) return
    setSubmitting(true)
    try {
      const { data: res } = await postAdminNodesByIdStoragePoolsByPoolResize({
        ...options, body: { size_gib: target, current_size_bytes: capacity.current_size_bytes },
      })
      if (res?.code !== 0) throw new Error(res?.message || "扩容失败")
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.nodeStoragePools(nodeId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.nodeStoragePoolDetail(nodeId, poolName) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.nodeStoragePoolUsage(nodeId) }),
        queryClient.invalidateQueries({ queryKey: getAdminNodesByIdQueryKey({ path: { id: nodeId } }) }),
        queryClient.invalidateQueries({ queryKey: getAdminNodesQueryKey() }),
      ])
      toast.success("存储池已扩容，实际容量已核实")
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, "扩容失败，请刷新容量核实结果"))
    } finally {
      void queryClient.invalidateQueries({ queryKey: getAdminNodesByIdStoragePoolsByPoolCapacityQueryKey(options) })
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-lg" preventClose={submitting}>
        <DialogHeader>
          <DialogTitle>扩容存储池</DialogTitle>
          <DialogDescription>增加「{poolName}」的容量，保留已有实例和数据。仅支持扩容，不能缩容。</DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : query.isError ? (
          <div className="space-y-3"><p className="text-sm text-destructive">{getErrorMessage(query.error, "读取容量失败")}</p><Button variant="outline" onClick={() => void query.refetch()}>重新检查</Button></div>
        ) : !capacity?.supported ? (
          <p className="text-sm text-muted-foreground">{capacity?.reason || "该存储池暂不支持在线扩容"}</p>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["当前配置容量", capacity.current_size_bytes],
                ["宿主可用空间", capacity.host_available_bytes],
                ["存储池待占用空间", capacity.pending_bytes],
                ["宿主预留空间", capacity.reserved_bytes],
              ].map(([label, bytes]) => <div key={String(label)}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{formatBytes(Number(bytes ?? 0))}</dd></div>)}
            </dl>
            <p className="text-sm text-muted-foreground">已扣除同分区其他池及当前池尚未占用的容量，并为宿主预留空间。当前最多可扩至 {capacity.max_size_gib} GiB。</p>
            <div className="space-y-2">
              <Label htmlFor="pool-resize-size">目标容量（GiB）</Label>
              <Input id="pool-resize-size" type="number" min={Math.floor((capacity.current_size_bytes ?? 0) / 1024 ** 3) + 1} max={capacity.max_size_gib} step={1} value={value} onChange={(event) => setSize(event.target.value)} disabled={submitting} />
            </div>
            {!valid && <p className="text-sm text-destructive">目标容量需大于当前容量，且不能超过可扩容上限。</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={onClose}>取消</Button>
          {capacity?.supported && <Button disabled={!valid || submitting} onClick={submit}>{submitting && <Spinner />}确认扩容</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
