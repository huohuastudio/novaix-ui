import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminNavMenus, deleteAdminNavMenusById } from "@/api"
import type { NavmenuNavMenuItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { NavMenuCreateSheet, NavMenuEditSheet } from "./nav-menu-form-sheet"

const locationLabels: Record<string, string> = {
  header: "顶部导航",
  footer: "底部导航",
  sidebar: "侧边栏",
}

export default function NavMenus() {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NavmenuNavMenuItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const [allMenus, setAllMenus] = useState<NavmenuNavMenuItem[]>([])

  const refreshAllMenus = useCallback(() => {
    getAdminNavMenus({ query: { page: 1, page_size: 100 } }).then(({ data: res }) => {
      setAllMenus(res?.data?.items ?? [])
    })
  }, [])

  useEffect(() => {
    refreshAllMenus()
  }, [refreshAllMenus])

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "sort_order" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminNavMenus({
      query: {
        page,
        page_size: pageSize,
        location: (filters.location as "header" | "footer" | "sidebar") || undefined,
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
    filterKeys: ["location", "status"],
  })

  const handleEdit = useCallback((item: NavmenuNavMenuItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: NavmenuNavMenuItem) => {
    const ok = await confirm({
      title: "删除菜单",
      description: `确定要删除菜单「${item.title}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminNavMenusById({ path: { id: item.id! } })
    table.refresh()
    refreshAllMenus()
  }, [table, confirm, refreshAllMenus])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
    refreshAllMenus()
  }

  const parentTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const m of allMenus) {
      if (m.id && m.title) map.set(m.id, m.title)
    }
    return map
  }, [allMenus])

  const columns: ColumnDef<NavmenuNavMenuItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "title",
      header: "标题",
      enableSorting: false,
    },
    {
      accessorKey: "url",
      header: "链接",
      enableSorting: false,
      cell: ({ row }) => {
        const url = row.original.url ?? ""
        return (
          <span className="max-w-[200px] truncate block" title={url}>{url}</span>
        )
      },
    },
    {
      accessorKey: "location",
      header: "位置",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "位置",
        filterOptions: [
          { label: "顶部导航", value: "header" },
          { label: "底部导航", value: "footer" },
          { label: "侧边栏", value: "sidebar" },
        ],
      },
      cell: ({ row }) => {
        const loc = row.original.location ?? ""
        return <Badge variant="outline">{locationLabels[loc] ?? loc}</Badge>
      },
    },
    {
      accessorKey: "parent_id",
      header: "父菜单",
      enableSorting: false,
      cell: ({ row }) => {
        const pid = row.original.parent_id
        if (!pid) return "—"
        return parentTitleMap.get(pid) ?? `#${pid}`
      },
    },
    {
      accessorKey: "target",
      header: "打开方式",
      enableSorting: false,
      cell: ({ row }) => row.original.target === "_blank" ? "新窗口" : "当前窗口",
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
  ], [handleEdit, handleDelete, formatDate, parentTitleMap])

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
            新建菜单
          </Button>
        }
      />
      <NavMenuCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
        menus={allMenus}
      />
      {editingItem && (
        <NavMenuEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          menu={editingItem}
          onSuccess={handleFormSuccess}
          menus={allMenus}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
