import { useCallback, useEffect, useState } from "react"
import { useFormatDate } from "@/hooks/use-site-settings"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Disc3, Download, Trash2 } from "lucide-react"
import { postAdminNodesByIdPullImage } from "@/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ImageSelector } from "@/components/image-selector"
import { useConfirm } from "@/hooks/use-confirm"
import { useTasks } from "@/hooks/use-tasks"
import { formatBytes, getErrorMessage} from "@/lib/utils"
import { incus, incusErrorMessage } from "@/lib/incus"
import { toast } from "sonner"
import type { IncusImage } from "@/types/incus"

export function ImageTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-3.5 w-12" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-12" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
              <TableCell><Skeleton className="size-7 rounded-md" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface Props {
  nodeId: number
}

function getImageLabel(img: IncusImage): string {
  return img.aliases?.[0]?.name || img.properties?.["description"] || img.fingerprint.slice(0, 12)
}

const archMap: Record<string, string> = { x86_64: "amd64", aarch64: "arm64" }

// ── Pull image dialog ──

const pullSchema = z.object({
  server: z.string().max(512),
  protocol: z.enum(["simplestreams", "incus"]).default("simplestreams"),
  alias: z.string().min(1, "请输入镜像别名"),
  type: z.enum(["container", "virtual-machine"]).default("container"),
})

type PullFormValues = z.infer<typeof pullSchema>

function PullImageDialog({
  open,
  onOpenChange,
  nodeId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeId: number
  onSuccess: () => void
}) {
  const form = useForm<PullFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pullSchema) as any,
    defaultValues: {
      server: "",
      protocol: "simplestreams",
      alias: "",
      type: "container",
    },
  })
  const { addTask } = useTasks()

  useEffect(() => {
    if (open) form.reset({
      server: "",
      protocol: "simplestreams",
      alias: "",
      type: "container",
    })
  }, [open, form])

  const onSubmit = async (values: PullFormValues) => {
    try {
      const { data: res } = await postAdminNodesByIdPullImage({
        path: { id: nodeId },
        body: {
          alias: values.alias,
          protocol: values.protocol,
          server: values.server,
          type: values.type,
        },
      })
      if (res?.code === 0) {
        const taskId = res.data as number
        addTask(taskId, "pull_node_image")
        toast.success("镜像拉取任务已提交", {
          description: "可在任务列表中查看进度",
        })
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res?.message ?? "拉取镜像失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败，请重试"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>从远程拉取镜像</DialogTitle>
          <DialogDescription>从远程镜像服务器下载镜像到该节点</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="server" render={({ field }) => (
              <FormItem>
                <FormLabel required>镜像服务器</FormLabel>
                <FormControl><Input placeholder="留空使用默认" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="alias" render={({ field }) => (
              <FormItem>
                <FormLabel required>镜像</FormLabel>
                <FormControl>
                  <ImageSelector
                    value={field.value}
                    onChange={field.onChange}
                    onServerChange={(s) => form.setValue("server", s)}
                    onProtocolChange={(p) => form.setValue("protocol", p)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>类型</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="container">容器</SelectItem>
                    <SelectItem value="virtual-machine">虚拟机</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "拉取中..." : "拉取"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ──

export default function NodeImageTable({ nodeId }: Props) {
  const formatDate = useFormatDate()
  const [images, setImages] = useState<IncusImage[]>([])
  const [loading, setLoading] = useState(true)
  const [pullOpen, setPullOpen] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const data = await incus<IncusImage[]>(nodeId, "1.0/images", { params: { recursion: "1" } })
      setImages(data ?? [])
    } catch (err) {
      toast.error(incusErrorMessage(err, "获取镜像列表失败"))
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据获取模式需在 effect 中触发加载状态
    fetchImages()
  }, [fetchImages])

  const handleDownload = useCallback(async (img: IncusImage) => {
    const { getWSTicket } = await import("@/lib/ws-ticket")
    const ticket = await getWSTicket()
    if (!ticket) return
    const url = `/api/v1/admin/nodes/${nodeId}/images/${img.fingerprint}/download?token=${encodeURIComponent(ticket)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }, [nodeId])

  const handleDelete = useCallback(async (img: IncusImage) => {
    const label = getImageLabel(img)
    const ok = await confirm({
      title: "删除镜像",
      description: `确定要删除镜像「${label}」(${img.fingerprint.slice(0, 12)}) 吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await incus(nodeId, `1.0/images/${img.fingerprint}`, { method: "DELETE" })
      toast.success("镜像已删除")
      fetchImages()
    } catch (err) {
      toast.error(incusErrorMessage(err, "删除镜像失败"))
    }
  }, [nodeId, confirm, fetchImages])

  if (loading) {
    return <ImageTableSkeleton />
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            该节点上已缓存的镜像，创建实例时会自动从远程服务器拉取并缓存
          </p>
          <Button variant="outline" onClick={() => setPullOpen(true)}>
            <Download className="size-3.5" />
            拉取镜像
          </Button>
        </div>

        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>指纹</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>架构</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead>属性</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {images.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    暂无缓存镜像
                  </TableCell>
                </TableRow>
              ) : (
                images.map((img) => (
                  <TableRow key={img.fingerprint}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Disc3 className="size-3.5 text-muted-foreground shrink-0" />
                        {getImageLabel(img)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{img.fingerprint.slice(0, 12)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {img.type === "virtual-machine" ? "虚拟机" : "容器"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {archMap[img.architecture] ?? img.architecture}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatBytes(img.size)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(img.uploaded_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {img.cached && <Badge variant="secondary" className="text-xs">缓存</Badge>}
                        {img.auto_update && <Badge variant="secondary" className="text-xs">自动更新</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => handleDownload(img)}
                            >
                              <Download className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>下载镜像</TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(img)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PullImageDialog
        open={pullOpen}
        onOpenChange={setPullOpen}
        nodeId={nodeId}
        onSuccess={fetchImages}
      />
      {ConfirmDialog}
    </>
  )
}
