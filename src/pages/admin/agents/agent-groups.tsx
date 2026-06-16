import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Trash2, Pencil, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminAgentGroups, deleteAdminAgentGroupsById } from "@/api"
import type { AgentGroupItem } from "@/api"
import { useDataTable } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { getErrorMessage } from "@/lib/utils"
import AgentGroupFormDialog from "./agent-group-form-dialog"
import PlanRateMatrixDialog from "./plan-rate-matrix-dialog"

export default function AgentGroups() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<AgentGroupItem | undefined>(undefined)
  const [matrixGroup, setMatrixGroup] = useState<AgentGroupItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  // 分组列表接口返回全量数组（无分页），用一页装下
  const fetchData = useCallback(async () => {
    const { data: res } = await getAdminAgentGroups()
    const items = res?.data ?? []
    return { items, total: items.length, page: 1, page_size: items.length || 1 }
  }, [])

  const table = useDataTable({ fetchFn: fetchData })
  const load = table.refresh

  const openCreate = () => {
    setEditingGroup(undefined)
    setFormOpen(true)
  }

  const openEdit = (group: AgentGroupItem) => {
    setEditingGroup(group)
    setFormOpen(true)
  }

  const handleDelete = useCallback(async (item: AgentGroupItem) => {
    const ok = await confirm({
      title: "删除代理分组",
      description: `确定要删除分组「${item.name}」吗？分组下仍有代理时无法删除。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminAgentGroupsById({ path: { id: item.id! } })
      if (res?.code === 0) {
        toast.success("已删除分组")
        load()
      } else {
        toast.error(res?.message ?? "删除失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }, [confirm, load])

  const columns: ColumnDef<AgentGroupItem>[] = useMemo(() => [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "名称" },
    {
      accessorKey: "commission_rate_first",
      header: "首单返佣",
      cell: ({ row }) => `${row.original.commission_rate_first ?? 0}%`,
    },
    {
      accessorKey: "commission_rate_recurring",
      header: "后续返佣",
      cell: ({ row }) => {
        const r = row.original.commission_rate_recurring ?? 0
        return r > 0 ? `${r}%` : <span className="text-muted-foreground">已关闭</span>
      },
    },
    {
      accessorKey: "discount_rate",
      header: "分销折扣",
      cell: ({ row }) => {
        const d = row.original.discount_rate ?? 0
        return d > 0
          ? <Badge variant="secondary">{d}% 拿货</Badge>
          : <span className="text-muted-foreground">未启用</span>
      },
    },
    {
      accessorKey: "description",
      header: "描述",
      cell: ({ row }) => row.original.description || <span className="text-muted-foreground">-</span>,
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
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setMatrixGroup(item)}>
                  <SlidersHorizontal className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>套餐费率矩阵</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(item)}>
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
  ], [handleDelete])

  return (
    <>
      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        enableSorting={false}
        toolbar={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            添加分组
          </Button>
        }
      />

      <AgentGroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editingGroup}
        onSuccess={() => {
          setFormOpen(false)
          toast.success(editingGroup ? "已保存分组" : "已创建分组")
          load()
        }}
      />

      {matrixGroup && (
        <PlanRateMatrixDialog
          open={!!matrixGroup}
          onOpenChange={(open) => { if (!open) setMatrixGroup(null) }}
          group={matrixGroup}
        />
      )}

      {ConfirmDialog}
    </>
  )
}
