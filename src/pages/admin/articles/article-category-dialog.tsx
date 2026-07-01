import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  getAdminArticleCategories,
  postAdminArticleCategories,
  putAdminArticleCategoriesById,
  deleteAdminArticleCategoriesById,
} from "@/api"
import type { ArticlecategoryArticleCategoryItem } from "@/api"

interface EditState {
  id?: number
  name: string
  slug: string
  description: string
  sort_order: number
}

const emptyEdit: EditState = { name: "", slug: "", description: "", sort_order: 0 }

function generateSlug(name: string): string {
  return (
    (name
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿]+/g, "-")
      .replace(/^-|-$/g, "") || "category") +
    "-" +
    Date.now().toString(36)
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export default function ArticleCategoryDialog({ open, onOpenChange, onChanged }: Props) {
  const [items, setItems] = useState<ArticlecategoryArticleCategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await getAdminArticleCategories({ query: { page: 1, page_size: 100 } })
      setItems(res?.data?.items ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEdit(null)
      fetchItems()
    }
  }, [open, fetchItems])

  const handleSave = async () => {
    if (!edit) return
    if (!edit.name.trim()) {
      toast.error("请输入分类名称")
      return
    }
    setSaving(true)
    try {
      const slug = edit.slug.trim() || generateSlug(edit.name)
      const { data: res } = edit.id
        ? await putAdminArticleCategoriesById({
            path: { id: edit.id },
            body: { name: edit.name.trim(), slug, description: edit.description.trim(), sort_order: edit.sort_order },
          })
        : await postAdminArticleCategories({
            body: { name: edit.name.trim(), slug, description: edit.description.trim() || undefined, sort_order: edit.sort_order },
          })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "保存失败")
        return
      }
      toast.success(edit.id ? "分类已更新" : "分类已创建")
      setEdit(null)
      await fetchItems()
      onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败，请重试"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: ArticlecategoryArticleCategoryItem) => {
    const ok = await confirm({
      title: "删除分类",
      description: `确定要删除分类「${item.name}」吗？分类下不能有文章。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    const { data: res } = await deleteAdminArticleCategoriesById({ path: { id: item.id! } })
    if (res?.code !== 0) {
      toast.error(res?.message ?? "删除失败")
      return
    }
    toast.success("分类已删除")
    await fetchItems()
    onChanged()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>文章分类管理</DialogTitle>
          <DialogDescription>为文章创建分类，便于归类筛选</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无分类</p>
          ) : (
            items.map((item) =>
              edit && edit.id === item.id ? (
                <CategoryEditor key={item.id} edit={edit} setEdit={setEdit} onSave={handleSave} onCancel={() => setEdit(null)} saving={saving} />
              ) : (
                <div key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.slug && <span className="text-xs text-muted-foreground">{item.slug}</span>}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEdit({ id: item.id, name: item.name ?? "", slug: item.slug ?? "", description: item.description ?? "", sort_order: item.sort_order ?? 0 })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            )
          )}

          {edit && !edit.id && (
            <CategoryEditor edit={edit} setEdit={setEdit} onSave={handleSave} onCancel={() => setEdit(null)} saving={saving} />
          )}
        </div>

        {!edit && (
          <Button variant="outline" className="shrink-0" onClick={() => setEdit({ ...emptyEdit })}>
            <Plus className="size-4" />
            添加分类
          </Button>
        )}
        {ConfirmDialog}
      </DialogContent>
    </Dialog>
  )
}

function CategoryEditor({ edit, setEdit, onSave, onCancel, saving }: {
  edit: EditState
  setEdit: (e: EditState) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-3 rounded-md border border-primary/40 bg-muted/30 p-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-muted-foreground">名称</label>
          <Input value={edit.name} placeholder="技术文章" onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">排序</label>
          <Input type="number" value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">别名 (Slug)</label>
        <Input value={edit.slug} placeholder="留空自动生成" onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">描述</label>
        <Textarea value={edit.description} placeholder="可选" rows={2} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="size-4" />
          取消
        </Button>
        <Button onClick={onSave} disabled={saving}>
          <Check className="size-4" />
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
