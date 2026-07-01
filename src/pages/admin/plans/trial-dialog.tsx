import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getAdminNodes, getAdminImages, postAdminPlansByIdTrial } from "@/api"
import type { ProductPlanItem, NodeNodeItem, ImageImageItem } from "@/api"
import { useTasks } from "@/hooks/use-tasks"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"

interface TrialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: ProductPlanItem
}

export default function TrialDialog({ open, onOpenChange, plan }: TrialDialogProps) {
  return open ? <TrialDialogContent onOpenChange={onOpenChange} plan={plan} /> : null
}

function TrialDialogContent({ onOpenChange, plan }: Omit<TrialDialogProps, 'open'>) {
  const { addTask } = useTasks()
  const [nodes, setNodes] = useState<NodeNodeItem[]>([])
  const [images, setImages] = useState<ImageImageItem[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")
  const [selectedImageId, setSelectedImageId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getAdminNodes({ query: { page_size: 100, status: 1 } }).then(({ data: res }) => {
      const items = res?.data?.items ?? []
      const nodeIds = plan.node_ids?.split(",").map(Number).filter(Boolean)
      const filtered = nodeIds?.length ? items.filter(n => nodeIds.includes(n.id!)) : items
      setNodes(filtered)
      if (filtered.length > 0) setSelectedNodeId(String(filtered[0].id))
    })

    getAdminImages({ query: { page_size: 100, status: 1 } }).then(({ data: res }) => {
      const items = res?.data?.items ?? []
      const imageIds = plan.image_ids?.split(",").map(Number).filter(Boolean)
      const filtered = imageIds?.length ? items.filter(i => imageIds.includes(i.id!)) : items
      setImages(filtered)
      if (filtered.length > 0) setSelectedImageId(String(filtered[0].id))
    })
  }, [plan])

  const handleSubmit = async () => {
    if (!selectedNodeId || !selectedImageId) {
      toast.error("请选择节点和镜像")
      return
    }
    setSubmitting(true)
    try {
      const { data: res } = await postAdminPlansByIdTrial({
        path: { id: plan.id! },
        body: {
          node_id: Number(selectedNodeId),
          image_id: Number(selectedImageId),
        },
      })
      if (res?.code === 0 && res.data?.task_id) {
        addTask(res.data.task_id, "trial_instance")
        toast.success("试建任务已提交，可在任务面板中查看进度")
        onOpenChange(false)
      } else {
        toast.error(res?.message || "提交试建任务失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "提交试建任务失败"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>试建实例</DialogTitle>
          <DialogDescription>
            用套餐「{plan.name}」的配置创建临时实例，验证创建流程是否正常，完成后自动销毁
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>节点</Label>
            <Select value={selectedNodeId} onValueChange={setSelectedNodeId}>
              <SelectTrigger>
                <SelectValue placeholder="选择节点" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map(n => (
                  <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>镜像</Label>
            <Select value={selectedImageId} onValueChange={setSelectedImageId}>
              <SelectTrigger>
                <SelectValue placeholder="选择镜像" />
              </SelectTrigger>
              <SelectContent>
                {images.map(i => (
                  <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={submitting || !selectedNodeId || !selectedImageId} onClick={handleSubmit}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            开始试建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
