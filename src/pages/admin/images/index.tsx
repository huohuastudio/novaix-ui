import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, Send, Loader2, Download, AlertCircle, FolderTree, EyeOff, ImageIcon } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatBytes } from "@/lib/utils"
import { getAdminImages, deleteAdminImagesById, getAdminImageGroups } from "@/api"
import type { ImageImageItem, ImageGroupItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { EmptyState } from "@/components/empty-state"
import ImageFormSheet from "./image-form-sheet"
import DistributeDialog from "./distribute-dialog"
import ImageGroupDialog from "./image-group-dialog"

const sourceTypeMap: Record<string, string> = {
  remote: "镜像库",
  url: "远程下载",
  upload: "上传",
  local: "本地",
}

const statusMap: Record<number, { label: string; variant: "default" | "secondary" | "outline" }> = {
  0: { label: "禁用", variant: "secondary" },
  1: { label: "启用", variant: "default" },
}

const statusFilterOptions = [
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
]


export default function Images() {
  useBreadcrumb([{ label: "镜像管理" }])
  const formatDate = useFormatDate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<ImageImageItem | undefined>()
  const [distributeImage, setDistributeImage] = useState<ImageImageItem | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groups, setGroups] = useState<ImageGroupItem[]>([])
  const { confirm, ConfirmDialog } = useConfirm()

  const loadGroups = useCallback(() => {
    getAdminImageGroups().then(({ data: res }) => setGroups(res?.data ?? []))
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  const groupNameMap = useMemo(() => {
    const m = new Map<number, string>()
    groups.forEach(g => { if (g.id != null) m.set(g.id, g.name ?? "") })
    return m
  }, [groups])

  const fetchImages = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "name" | "os" | "type" | "status" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminImages({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        status: filters.status !== undefined ? Number(filters.status) as 0 | 1 : undefined,
        group_id: filters.group_id ? Number(filters.group_id) : undefined,
        sort,
        order,
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
    fetchFn: fetchImages,
    filterKeys: ["name", "status", "group_id"],
  })

  const handleCreate = () => {
    setEditingImage(undefined)
    setSheetOpen(true)
  }

  const handleEdit = useCallback((image: ImageImageItem) => {
    setEditingImage(image)
    setSheetOpen(true)
  }, [])

  const handleDelete = useCallback(async (image: ImageImageItem) => {
    const ok = await confirm({
      title: "删除镜像",
      description: `确定要删除镜像「${image.name}」吗？${image.source_type === "upload" ? "关联的文件也会被删除。" : ""}此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminImagesById({ path: { id: image.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setSheetOpen(false)
    table.refresh()
  }

  const columns: ColumnDef<ImageImageItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "名称",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称...",
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{row.original.name}</span>
          {row.original.hidden && (
            <Tooltip><TooltipTrigger><EyeOff className="size-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent>客户端已隐藏</TooltipContent></Tooltip>
          )}
        </div>
      ),
    },
    {
      id: "group_id",
      header: "分组",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "分组",
        filterOptions: groups.map(g => ({ label: g.name ?? "", value: String(g.id) })),
      },
      cell: ({ row }) => {
        const gid = row.original.group_id
        const name = gid != null ? groupNameMap.get(gid) : undefined
        return name ? <Badge variant="outline">{name}</Badge> : <span className="text-muted-foreground">-</span>
      },
    },
    {
      id: "os_info",
      header: "系统",
      cell: ({ row }) => {
        const img = row.original
        return (
          <span className="text-sm">
            {img.os} {img.version}
          </span>
        )
      },
    },
    {
      accessorKey: "arch",
      header: "架构",
    },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const t = row.original.type
        return t === "virtual-machine" ? "虚拟机" : "容器"
      },
    },
    {
      id: "source",
      header: "来源",
      cell: ({ row }) => {
        const img = row.original
        const ds = img.download_status as string | undefined
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">
              {sourceTypeMap[img.source_type ?? ""] ?? img.source_type}
            </Badge>
            {ds === "pending" && (
              <Tooltip><TooltipTrigger><Download className="size-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent>等待下载</TooltipContent></Tooltip>
            )}
            {ds === "downloading" && (
              <Tooltip><TooltipTrigger><Loader2 className="size-3.5 animate-spin text-blue-500" /></TooltipTrigger><TooltipContent>正在下载</TooltipContent></Tooltip>
            )}
            {ds === "failed" && (
              <Tooltip><TooltipTrigger><AlertCircle className="size-3.5 text-destructive" /></TooltipTrigger><TooltipContent>下载失败</TooltipContent></Tooltip>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "size",
      header: "大小",
      cell: ({ row }) => formatBytes(row.original.size ?? undefined),
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: statusFilterOptions,
      },
      cell: ({ row }) => {
        const s = row.original.status ?? 0
        const info = statusMap[s] ?? { label: "未知", variant: "outline" as const }
        return <Badge variant={info.variant}>{info.label}</Badge>
      },
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const image = row.original
        const canDistribute = !image.download_status || image.download_status === "completed"
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setDistributeImage(image)} disabled={!canDistribute}>
                  <Send className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{canDistribute ? "分发到节点" : "镜像文件未就绪"}</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(image)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(image)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete, formatDate, groups, groupNameMap])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">镜像管理</h1>
          <HelpLink path="/novaix/image" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">添加操作系统镜像后，需通过「分发」将镜像推送到目标节点，用户购买时才能选择对应系统</p>
      </div>
      <DataTable
        tourId="image-table"
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(true)}>
              <FolderTree className="size-4" />
              分组管理
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              添加镜像
            </Button>
          </div>
        }
        emptyState={
          <EmptyState
            icon={ImageIcon}
            title="暂无镜像"
            description="添加操作系统镜像，分发到节点后用户即可选择"
            action={{ label: "添加镜像", onClick: handleCreate }}
          />
        }
      />
      <ImageFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        image={editingImage}
        onSuccess={handleFormSuccess}
        groups={groups}
      />
      <DistributeDialog
        open={!!distributeImage}
        onOpenChange={(open) => { if (!open) setDistributeImage(null) }}
        image={distributeImage}
      />
      <ImageGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onChanged={() => { loadGroups(); table.refresh() }}
      />
      {ConfirmDialog}
    </div>
  )
}
