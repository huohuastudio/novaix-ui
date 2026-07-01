import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminArticles, deleteAdminArticlesById, getAdminArticleCategories } from "@/api"
import type { ArticleArticleItem, ArticlecategoryArticleCategoryItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { ArticleCreateSheet, ArticleEditSheet } from "./article-form-sheet"
import ArticleCategoryDialog from "./article-category-dialog"

const TYPE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  news: { label: "新闻", variant: "default" },
  announcement: { label: "公告", variant: "secondary" },
  activity: { label: "活动", variant: "outline" },
}

export default function Articles() {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ArticleArticleItem | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const [categories, setCategories] = useState<ArticlecategoryArticleCategoryItem[]>([])

  const fetchCategories = useCallback(async () => {
    const { data: res } = await getAdminArticleCategories({ query: { page: 1, page_size: 100 } })
    setCategories(res?.data?.items ?? [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories()
  }, [fetchCategories])

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const cat of categories) {
      if (cat.id && cat.name) map.set(cat.id, cat.name)
    }
    return map
  }, [categories])

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "sort_order" | "status" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminArticles({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.title as string) || undefined,
        type: (filters.type as string) || undefined,
        category_id: filters.category_id ? Number(filters.category_id) : undefined,
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
    filterKeys: ["title", "type", "category_id", "status"],
  })

  const handleEdit = useCallback((item: ArticleArticleItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: ArticleArticleItem) => {
    const ok = await confirm({
      title: "删除文章",
      description: `确定要删除文章「${item.title}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminArticlesById({ path: { id: item.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
  }

  const columns: ColumnDef<ArticleArticleItem>[] = useMemo(() => [
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
      accessorKey: "type",
      header: "类型",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "类型",
        filterOptions: [
          { label: "新闻", value: "news" },
          { label: "公告", value: "announcement" },
          { label: "活动", value: "activity" },
        ],
      },
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        const info = TYPE_MAP[type] ?? { label: type, variant: "secondary" as const }
        return <Badge variant={info.variant}>{info.label}</Badge>
      },
    },
    {
      accessorKey: "category_id",
      header: "分类",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "分类",
        filterOptions: categories.map(c => ({ label: c.name ?? "", value: String(c.id) })),
      },
      cell: ({ row }) => {
        const catId = row.getValue("category_id") as number | undefined
        if (!catId) return <span className="text-muted-foreground">-</span>
        return categoryMap.get(catId) ?? <span className="text-muted-foreground">-</span>
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
      accessorKey: "is_pinned",
      header: "置顶",
      enableSorting: false,
      cell: ({ row }) => {
        const pinned = row.getValue("is_pinned") as boolean
        return pinned ? <Badge variant="default">置顶</Badge> : <span className="text-muted-foreground">-</span>
      },
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
  ], [handleEdit, handleDelete, formatDate, categoryMap, categories])

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
              新建文章
            </Button>
          </div>
        }
      />
      <ArticleCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
        categories={categories}
      />
      {editingItem && (
        <ArticleEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          article={editingItem}
          onSuccess={handleFormSuccess}
          categories={categories}
        />
      )}
      <ArticleCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onChanged={() => { fetchCategories(); table.refresh() }}
      />
      {ConfirmDialog}
    </div>
  )
}
