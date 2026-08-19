import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, Globe, Eye, EyeOff } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminRegions, deleteAdminRegionsById } from "@/api"
import type { RegionRegionItem } from "@/api"
import { getAdminRegionsQueryKey } from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { RegionCreateSheet, RegionEditSheet } from "./region-form-sheet"

const statusLabels: Record<number, { label: string; variant: "default" | "secondary" | "outline" }> = {
  1: { label: "活跃", variant: "default" },
  0: { label: "停用", variant: "secondary" },
  2: { label: "维护中", variant: "outline" },
}

export default function Regions() {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RegionRegionItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "sort_order" | "status" | "created_at" | "code" | "display_name" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminRegions({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.display_name as string) || undefined,
        status: filters.status !== undefined ? Number(filters.status) as 0 | 1 | 2 : undefined,
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
    queryKey: getAdminRegionsQueryKey(),
    filterKeys: ["display_name", "status"],
  })

  const handleEdit = useCallback((item: RegionRegionItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: RegionRegionItem) => {
    const ok = await confirm({
      title: "删除区域",
      description: `确定要删除区域「${item.display_name}」吗？如果区域下仍有关联节点，删除将被阻止。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteAdminRegionsById({ path: { id: item.id! } })
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }, [table, confirm])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
  }

  const columns: ColumnDef<RegionRegionItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "display_name",
      header: "名称",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称...",
      },
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1.5">
            {item.flag && <span>{item.flag}</span>}
            <span className="font-medium">{item.display_name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "code",
      header: "代码",
      enableSorting: true,
      cell: ({ row }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.getValue("code")}</code>,
    },
    {
      id: "location",
      header: "位置",
      cell: ({ row }) => {
        const item = row.original
        return [item.city, item.country].filter(Boolean).join(", ") || <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: "network_provider",
      header: "线路",
      cell: ({ row }) => row.getValue("network_provider") || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "test_ip",
      header: "测试 IP",
      cell: ({ row }) => row.getValue("test_ip") || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "public_visible",
      header: "公开展示",
      cell: ({ row }) => {
        const visible = row.getValue("public_visible") as boolean
        return visible
          ? <Eye className="size-4 text-green-600 dark:text-green-400" />
          : <EyeOff className="size-4 text-muted-foreground" />
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
          { label: "活跃", value: "1" },
          { label: "停用", value: "0" },
          { label: "维护中", value: "2" },
        ],
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as number
        const info = statusLabels[status] ?? { label: "未知", variant: "secondary" as const }
        return <Badge variant={info.variant}>{info.label}</Badge>
      },
    },
    {
      accessorKey: "sort_order",
      header: "排序",
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
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">区域管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理服务器区域的地理位置、线路信息和售卖配置，区域用于下单分区和仪表盘地图展示</p>
      </div>
      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        fetching={table.fetching}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        emptyIcon={Globe}
        emptyTitle="暂无区域"
        emptyDescription="添加区域以管理节点的地理位置和售卖配置"
        emptyAction={<Button variant="outline" onClick={() => setCreateOpen(true)}>添加区域</Button>}
        toolbar={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            添加区域
          </Button>
        }
      />
      <RegionCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
      />
      {editingItem && (
        <RegionEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          region={editingItem}
          onSuccess={handleFormSuccess}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
