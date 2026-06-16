import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useConfirm } from "@/hooks/use-confirm"
import { getErrorMessage } from "@/lib/utils"

interface GroupItem {
  id?: number
  name?: string
  sort_order?: number
  status?: number
}

interface EditState {
  id?: number
  name: string
  sort_order: number
  status: number
}

const emptyEdit: EditState = { name: "", sort_order: 0, status: 1 }

type ApiResponse = { data?: { code?: number; message?: string } }

export interface GroupDialogConfig<T extends GroupItem> {
  title: string
  description: string
  deleteWarning: string
  placeholder: string
  fetchFn: () => Promise<T[]>
  createFn: (body: { name: string; sort_order: number; status: number }) => Promise<ApiResponse>
  updateFn: (id: number, body: { name: string; sort_order: number; status: number }) => Promise<ApiResponse>
  deleteFn: (id: number) => Promise<ApiResponse>
  renderDetail?: (item: T) => React.ReactNode
}

interface Props<T extends GroupItem> {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  config: GroupDialogConfig<T>
}

export default function GroupDialog<T extends GroupItem>({ open, onOpenChange, onChanged, config }: Props<T>) {
  const [groups, setGroups] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      setGroups(await config.fetchFn())
    } finally {
      setLoading(false)
    }
  }, [config])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEdit(null)
      fetchGroups()
    }
  }, [open, fetchGroups])

  const handleSave = async () => {
    if (!edit) return
    if (!edit.name.trim()) {
      toast.error("请输入分组名称")
      return
    }
    setSaving(true)
    try {
      const body = { name: edit.name.trim(), sort_order: edit.sort_order, status: edit.status }
      const { data: res } = edit.id
        ? await config.updateFn(edit.id, body)
        : await config.createFn(body)
      if (res?.code !== 0) {
        toast.error(res?.message ?? "保存失败")
        return
      }
      toast.success(edit.id ? "分组已更新" : "分组已创建")
      setEdit(null)
      await fetchGroups()
      onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败，请重试"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (group: T) => {
    const ok = await confirm({
      title: "删除分组",
      description: `确定要删除分组「${group.name}」吗？${config.deleteWarning}`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    const { data: res } = await config.deleteFn(group.id!)
    if (res?.code !== 0) {
      toast.error(res?.message ?? "删除失败")
      return
    }
    toast.success("分组已删除")
    await fetchGroups()
    onChanged()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))
          ) : groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无分组</p>
          ) : (
            groups.map((g) =>
              edit && edit.id === g.id ? (
                <GroupEditor key={g.id} edit={edit} setEdit={setEdit} onSave={handleSave} onCancel={() => setEdit(null)} saving={saving} placeholder={config.placeholder} />
              ) : (
                <div key={g.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{g.name}</span>
                      {g.status === 0 && <Badge variant="secondary">禁用</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      排序 {g.sort_order ?? 0}
                      {config.renderDetail?.(g)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEdit({ id: g.id, name: g.name ?? "", sort_order: g.sort_order ?? 0, status: g.status ?? 1 })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleDelete(g)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            )
          )}

          {edit && !edit.id && (
            <GroupEditor edit={edit} setEdit={setEdit} onSave={handleSave} onCancel={() => setEdit(null)} saving={saving} placeholder={config.placeholder} />
          )}
        </div>

        {!edit && (
          <Button variant="outline" className="shrink-0" onClick={() => setEdit({ ...emptyEdit })}>
            <Plus className="size-4" />
            添加分组
          </Button>
        )}
        {ConfirmDialog}
      </DialogContent>
    </Dialog>
  )
}

function GroupEditor({ edit, setEdit, onSave, onCancel, saving, placeholder }: {
  edit: EditState
  setEdit: (e: EditState) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  placeholder: string
}) {
  return (
    <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-muted-foreground">名称</label>
          <Input value={edit.name} placeholder={placeholder} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">排序</label>
          <Input type="number" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={edit.status === 1} onCheckedChange={(v) => setEdit({ ...edit, status: v ? 1 : 0 })} />
          <span className="text-sm">启用</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            <X className="size-4" />
            取消
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            <Check className="size-4" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </div>
  )
}
