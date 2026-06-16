import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { HardDrive, Plus, Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useConfirm } from "@/hooks/use-confirm"
import { formatBytes } from "@/lib/utils"
import { incus, incusErrorMessage } from "@/lib/incus"
import { toast } from "sonner"
import type { IncusStoragePoolDetail, IncusStorageVolume } from "@/types/incus"

interface Props {
  nodeId: number
}

interface PoolResources {
  space?: { used: number; total: number }
  inodes?: { used: number; total: number }
}


function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const color = pct > 80 ? "bg-destructive" : pct > 60 ? "bg-yellow-500" : "bg-primary"
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{formatBytes(used)} / {formatBytes(total)} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Create volume dialog ──

const volumeSchema = z.object({
  name: z.string().min(1, "请输入卷名称"),
  size: z.string().min(1, "请输入大小"),
  content_type: z.enum(["filesystem", "block"]).default("filesystem"),
})

type VolumeFormValues = z.infer<typeof volumeSchema>

function CreateVolumeDialog({
  open,
  onOpenChange,
  nodeId,
  poolName,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: number
  poolName: string
  onSuccess: () => void
}) {
  const form = useForm<VolumeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(volumeSchema) as any,
    defaultValues: { name: "", size: "10GiB", content_type: "filesystem" },
  })

  useEffect(() => {
    if (open) form.reset({ name: "", size: "10GiB", content_type: "filesystem" })
  }, [open, form])

  const onSubmit = async (values: VolumeFormValues) => {
    try {
      await incus(nodeId, `1.0/storage-pools/${poolName}/volumes/custom`, {
        method: "POST",
        body: {
          name: values.name,
          content_type: values.content_type,
          config: { size: values.size },
        },
      })
      toast.success(`卷 ${values.name} 已创建`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(incusErrorMessage(err, "创建存储卷失败"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" preventClose>
        <DialogHeader>
          <DialogTitle>创建自定义卷</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel required>卷名称</FormLabel>
                <FormControl><Input placeholder="my-volume" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="size" render={({ field }) => (
                <FormItem>
                  <FormLabel>大小</FormLabel>
                  <FormControl><Input placeholder="10GiB" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>内容类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="filesystem">文件系统</SelectItem>
                      <SelectItem value="block">块设备</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Pool section ──

function PoolSection({ pool, nodeId }: { pool: IncusStoragePoolDetail; nodeId: number }) {
  const [volumes, setVolumes] = useState<IncusStorageVolume[]>([])
  const [resources, setResources] = useState<PoolResources | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [vols, res] = await Promise.all([
        incus<IncusStorageVolume[]>(nodeId, `1.0/storage-pools/${pool.name}/volumes`, { params: { recursion: "1" } }).catch(() => []),
        incus<PoolResources>(nodeId, `1.0/storage-pools/${pool.name}/resources`).catch(() => null),
      ])
      setVolumes(vols ?? [])
      setResources(res)
    } finally {
      setLoading(false)
    }
  }, [nodeId, pool.name])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据获取模式需在 effect 中触发加载状态
    fetchData()
  }, [fetchData])

  const handleDeleteVolume = useCallback(async (vol: IncusStorageVolume) => {
    if ((vol.used_by?.length ?? 0) > 0) {
      toast.error("该卷正在被使用，无法删除")
      return
    }
    const ok = await confirm({
      title: "删除存储卷",
      description: `确定要删除卷「${vol.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await incus(nodeId, `1.0/storage-pools/${pool.name}/volumes/${vol.type}/${vol.name}`, { method: "DELETE" })
      toast.success("存储卷已删除")
      fetchData()
    } catch (err) {
      toast.error(incusErrorMessage(err, "删除存储卷失败"))
    }
  }, [nodeId, pool.name, confirm, fetchData])

  const customVolumes = volumes.filter((v) => v.type === "custom")
  const otherCount = volumes.length - customVolumes.length

  return (
    <>
      <div className="space-y-6">
        {/* Pool header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{pool.name}</h3>
            <Badge variant="outline">{pool.driver}</Badge>
            <Badge variant={pool.status === "Created" ? "default" : "secondary"}>{pool.status}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">{pool.used_by?.length ?? 0} 个引用</span>
        </div>

        {pool.description && (
          <p className="text-sm text-muted-foreground">{pool.description}</p>
        )}

        {/* Pool info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
          {pool.config?.["source"] && (
            <div>
              <div className="text-muted-foreground">路径</div>
              <div className="font-medium truncate">{pool.config["source"]}</div>
            </div>
          )}
          <div>
            <div className="text-muted-foreground">驱动</div>
            <div className="font-medium">{pool.driver}</div>
          </div>
          <div>
            <div className="text-muted-foreground">卷数量</div>
            <div className="font-medium">{volumes.length}</div>
          </div>
          {pool.config?.["size"] && (
            <div>
              <div className="text-muted-foreground">配置大小</div>
              <div className="font-medium">{pool.config["size"]}</div>
            </div>
          )}
        </div>

        {/* Usage bar */}
        {resources?.space && resources.space.total > 0 && (
          <UsageBar
            used={resources.space.used}
            total={resources.space.total}
            label="磁盘用量"
          />
        )}

        {/* Volumes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">自定义卷</h4>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              创建卷
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" className="text-muted-foreground" />
            </div>
          ) : customVolumes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">暂无自定义卷</p>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>内容类型</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>使用</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customVolumes.map((v) => (
                    <TableRow key={v.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <HardDrive className="size-3.5 text-muted-foreground shrink-0" />
                          {v.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.content_type || "filesystem"}</TableCell>
                      <TableCell className="text-muted-foreground">{v.config?.["size"] || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{v.used_by?.length ?? 0} 个实例</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteVolume(v)}
                          disabled={(v.used_by?.length ?? 0) > 0}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {otherCount > 0 && (
            <p className="text-xs text-muted-foreground">
              另有 {otherCount} 个系统卷（image / container / virtual-machine）
            </p>
          )}
        </div>
      </div>

      <CreateVolumeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        nodeId={nodeId}
        poolName={pool.name}
        onSuccess={fetchData}
      />
      {ConfirmDialog}
    </>
  )
}

export function StorageTableSkeleton() {
  return (
    <div className="space-y-0">
      {[0, 1].map((idx) => (
        <div key={idx}>
          {idx > 0 && <Separator className="my-8" />}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="h-2 w-full max-w-2xl rounded-full" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ──

export default function NodeStorageTable({ nodeId }: Props) {
  const [pools, setPools] = useState<IncusStoragePoolDetail[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPools = useCallback(async () => {
    setLoading(true)
    try {
      const data = await incus<IncusStoragePoolDetail[]>(nodeId, "1.0/storage-pools", { params: { recursion: "1" } })
      setPools(data ?? [])
    } catch (err) {
      toast.error(incusErrorMessage(err, "获取存储池列表失败"))
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据获取模式需在 effect 中触发加载状态
    fetchPools()
  }, [fetchPools])

  if (loading) {
    return <StorageTableSkeleton />
  }

  if (pools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">暂无存储池</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {pools.map((pool, i) => (
        <div key={pool.name}>
          {i > 0 && <Separator className="my-8" />}
          <PoolSection pool={pool} nodeId={nodeId} />
        </div>
      ))}
    </div>
  )
}
