import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminBrandAssets, deleteAdminBrandAssetsById } from "@/api"
import type { BrandassetBrandAssetItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { BrandAssetCreateSheet, BrandAssetEditSheet } from "./brand-asset-form-sheet"

function formatFileSize(size?: number): string {
  if (!size) return "—"
  if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + " MB"
  return (size / 1024).toFixed(1) + " KB"
}

export default function BrandAssets() {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BrandassetBrandAssetItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "sort_order" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminBrandAssets({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
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
    fetchFn: fetchData,
    filterKeys: ["name"],
  })

  const handleEdit = useCallback((item: BrandassetBrandAssetItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: BrandassetBrandAssetItem) => {
    const ok = await confirm({
      title: "删除素材",
      description: `确定要删除素材「${item.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminBrandAssetsById({ path: { id: item.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
  }

  const columns: ColumnDef<BrandassetBrandAssetItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "名称",
      enableSorting: false,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称...",
      },
    },
    {
      accessorKey: "file_url",
      header: "文件",
      enableSorting: false,
      cell: ({ row }) => {
        const url = row.getValue("file_url") as string
        if (!url) return "—"
        if (/\.(jpe?g|png|gif|webp|ico|svg)$/i.test(url)) {
          return <img src={url} className="h-8 w-8 rounded object-cover" alt="" />
        }
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[200px] truncate block text-primary hover:underline"
            title={url}
          >
            {url}
          </a>
        )
      },
    },
    {
      accessorKey: "file_size",
      header: "文件大小",
      enableSorting: false,
      cell: ({ row }) => formatFileSize(row.getValue("file_size") as number),
    },
    {
      accessorKey: "sort_order",
      header: "排序权重",
      enableSorting: true,
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
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(item)}>
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑</TooltipContent>
            </Tooltip>
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
  ], [handleEdit, handleDelete, formatDate])

  return (
    <div className="space-y-6">
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
            添加素材
          </Button>
        }
      />
      <BrandAssetCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
      />
      {editingItem && (
        <BrandAssetEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          brandAsset={editingItem}
          onSuccess={handleFormSuccess}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
