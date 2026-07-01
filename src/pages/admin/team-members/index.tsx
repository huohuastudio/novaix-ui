import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminTeamMembers, deleteAdminTeamMembersById } from "@/api"
import type { TeammemberTeamMemberItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { TeamMemberCreateSheet, TeamMemberEditSheet } from "./team-member-form-sheet"

export default function TeamMembers() {
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TeammemberTeamMemberItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "sort_order" | "status" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminTeamMembers({
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

  const handleEdit = useCallback((item: TeammemberTeamMemberItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: TeammemberTeamMemberItem) => {
    const ok = await confirm({
      title: "删除成员",
      description: `确定要删除成员「${item.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminTeamMembersById({ path: { id: item.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
  }

  const columns: ColumnDef<TeammemberTeamMemberItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "姓名",
      enableSorting: false,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索姓名...",
      },
    },
    {
      accessorKey: "avatar",
      header: "头像",
      enableSorting: false,
      cell: ({ row }) => {
        const avatar = row.getValue("avatar") as string
        if (!avatar) return "—"
        return <img src={avatar} className="h-8 w-8 rounded object-cover" alt="" />
      },
    },
    {
      accessorKey: "position",
      header: "职位",
      enableSorting: false,
      cell: ({ row }) => row.getValue("position") || "—",
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
            添加成员
          </Button>
        }
      />
      <TeamMemberCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
      />
      {editingItem && (
        <TeamMemberEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          teamMember={editingItem}
          onSuccess={handleFormSuccess}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
