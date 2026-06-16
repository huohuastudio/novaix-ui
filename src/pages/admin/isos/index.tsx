import { useCallback, useMemo, useState, type FormEvent } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Trash2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAdminIsos, postAdminIsos, putAdminIsosByIdReady, deleteAdminIsosById } from "@/api"
import type { IsoIsoItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate } from "@/hooks/use-site-settings"
import { formatBytes, getErrorMessage } from "@/lib/utils"

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  uploading: { label: "上传中", variant: "outline" },
  ready: { label: "就绪", variant: "default" },
  error: { label: "错误", variant: "destructive" },
}

export default function ISOs() {
  useBreadcrumb([{ label: "ISO 镜像" }])
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminIsos({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
      },
    })
    return {
      items: res?.data?.items ?? [],
      total: res?.data?.total ?? 0,
      page: res?.data?.page ?? 1,
      page_size: res?.data?.page_size ?? pageSize,
    }
  }, [])

  const table = useDataTable({
    fetchFn: fetchData,
    filterKeys: ["name"],
  })

  const handleMarkReady = useCallback(async (item: IsoIsoItem) => {
    const ok = await confirm({
      title: "标记就绪",
      description: `确定要将「${item.name}」标记为就绪状态吗？`,
      confirmText: "标记就绪",
    })
    if (!ok) return
    try {
      const { data: res } = await putAdminIsosByIdReady({ path: { id: item.id! } })
      if (res?.code === 0) {
        toast.success("已标记就绪")
        table.refresh()
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    }
  }, [table, confirm])

  const handleDelete = useCallback(async (item: IsoIsoItem) => {
    const ok = await confirm({
      title: "删除 ISO",
      description: `确定要删除「${item.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteAdminIsosById({ path: { id: item.id! } })
      toast.success("已删除")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }, [table, confirm])

  const handleCreate = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setCreating(true)
    try {
      const { data: res } = await postAdminIsos({
        body: {
          name: form.get("name") as string,
          filename: form.get("filename") as string,
          description: form.get("description") as string,
        },
      })
      if (res?.code === 0) {
        toast.success("创建成功")
        setCreateOpen(false)
        table.refresh()
      } else {
        toast.error(res?.message ?? "创建失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "创建失败"))
    } finally {
      setCreating(false)
    }
  }, [table])

  const columns: ColumnDef<IsoIsoItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "名称",
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称...",
      },
    },
    {
      accessorKey: "filename",
      header: "文件名",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.filename}</span>
      ),
    },
    {
      accessorKey: "size",
      header: "大小",
      cell: ({ row }) => formatBytes(row.original.size),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statusMap[row.original.status ?? ""] ?? { label: row.original.status, variant: "secondary" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      accessorKey: "description",
      header: "描述",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm line-clamp-1 max-w-[200px]">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            {item.status === "uploading" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => handleMarkReady(item)}>
                    <CheckCircle className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>标记就绪</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ], [handleMarkReady, handleDelete, formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">ISO 镜像</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理 ISO 镜像文件</p>
      </div>
      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        toolbar={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            创建 ISO
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建 ISO 记录</DialogTitle>
            <DialogDescription>创建一条 ISO 镜像记录，上传文件后标记为就绪状态即可使用</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="iso-name">名称</Label>
              <Input id="iso-name" name="name" required placeholder="例如：Ubuntu 22.04 LTS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iso-filename">文件名</Label>
              <Input id="iso-filename" name="filename" required placeholder="例如：ubuntu-22.04.iso" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iso-description">描述</Label>
              <Input id="iso-description" name="description" placeholder="可选" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" disabled={creating}>
                {creating ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  )
}
