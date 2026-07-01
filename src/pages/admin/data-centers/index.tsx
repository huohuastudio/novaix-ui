import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminDataCenters, deleteAdminDataCentersById } from "@/api"
import type { DatacenterinfoDataCenterInfoItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { DataCenterCreateSheet, DataCenterEditSheet } from "./data-center-form-sheet"

export default function DataCenters() {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DatacenterinfoDataCenterInfoItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "sort_order" | "status" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminDataCenters({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
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
    filterKeys: ["name", "status"],
  })

  const handleEdit = useCallback((item: DatacenterinfoDataCenterInfoItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: DatacenterinfoDataCenterInfoItem) => {
    const ok = await confirm({
      title: "删除数据中心",
      description: `确定要删除数据中心「${item.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminDataCentersById({ path: { id: item.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
  }

  const columns: ColumnDef<DatacenterinfoDataCenterInfoItem>[] = useMemo(() => [
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
      accessorKey: "city",
      header: "城市",
      enableSorting: false,
    },
    {
      accessorKey: "country",
      header: "国家/地区",
      enableSorting: false,
    },
    {
      accessorKey: "test_ip",
      header: "测试 IP",
      enableSorting: false,
      cell: ({ row }) => row.getValue("test_ip") || <span className="text-muted-foreground">-</span>,
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
            添加数据中心
          </Button>
        }
      />
      <DataCenterCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
      />
      {editingItem && (
        <DataCenterEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          dataCenter={editingItem}
          onSuccess={handleFormSuccess}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
