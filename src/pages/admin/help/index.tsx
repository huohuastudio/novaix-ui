import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminHelpArticles, deleteAdminHelpArticlesById, getAdminHelpCategories } from "@/api"
import type { HelparticleHelpArticleItem, HelpcategoryHelpCategoryItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { HelpArticleCreateSheet, HelpArticleEditSheet } from "./help-article-form-sheet"
import HelpCategoryDialog from "./help-category-dialog"

export default function HelpCenter() {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HelparticleHelpArticleItem | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const [categories, setCategories] = useState<HelpcategoryHelpCategoryItem[]>([])

  const fetchCategories = useCallback(async () => {
    const { data: res } = await getAdminHelpCategories({ query: { page: 1, page_size: 100 } })
    setCategories(res?.data?.items ?? [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories()
  }, [fetchCategories])

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of categories) {
      if (c.id != null && c.name) map.set(c.id, c.name)
    }
    return map
  }, [categories])

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "sort_order" | "status" | "created_at" | "view_count" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminHelpArticles({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.title as string) || undefined,
        status: filters.status !== undefined ? Number(filters.status) as 0 | 1 : undefined,
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
    filterKeys: ["title", "status"],
  })

  const handleEdit = useCallback((item: HelparticleHelpArticleItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: HelparticleHelpArticleItem) => {
    const ok = await confirm({
      title: "删除文章",
      description: `确定要删除文章「${item.title}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminHelpArticlesById({ path: { id: item.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
  }

  const columns: ColumnDef<HelparticleHelpArticleItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "title",
      header: "标题",
      enableSorting: false,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索标题...",
      },
    },
    {
      accessorKey: "category_id",
      header: "分类",
      enableSorting: false,
      cell: ({ row }) => {
        const categoryId = row.getValue("category_id") as number
        return categoryMap.get(categoryId) ?? "-"
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: [
          { label: "显示", value: "1" },
          { label: "隐藏", value: "0" },
        ],
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as number
        return (
          <Badge variant={status === 1 ? "default" : "secondary"}>
            {status === 1 ? "显示" : "隐藏"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "view_count",
      header: "浏览量",
      enableSorting: true,
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
  ], [handleEdit, handleDelete, formatDate, categoryMap])

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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
              <FolderTree className="size-4" />
              分类管理
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              添加文章
            </Button>
          </div>
        }
      />
      <HelpArticleCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
        categories={categories}
      />
      {editingItem && (
        <HelpArticleEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          article={editingItem}
          onSuccess={handleFormSuccess}
          categories={categories}
        />
      )}
      <HelpCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onChanged={() => { fetchCategories(); table.refresh() }}
      />
      {ConfirmDialog}
    </div>
  )
}
