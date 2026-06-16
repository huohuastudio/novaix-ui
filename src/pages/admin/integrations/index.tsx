import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAdminIntegrations, deleteAdminIntegrationsById } from "@/api"
import type { IntegrationIntegrationResponse } from "@/api"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"
import { IntegrationCreateSheet, IntegrationEditSheet } from "./integration-form-sheet"

export default function Integrations() {
  useBreadcrumb([{ label: "集成方管理" }])
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<IntegrationIntegrationResponse | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchItems = useCallback(async ({ pageSize }: FetchParams) => {
    const { data: res } = await getAdminIntegrations()
    const items = res?.data ?? []
    return {
      items,
      total: items.length,
      page: 1,
      page_size: pageSize,
    }
  }, [])

  const table = useDataTable<IntegrationIntegrationResponse>({
    fetchFn: fetchItems,
    filterKeys: [],
  })

  const handleDelete = useCallback(async (item: IntegrationIntegrationResponse) => {
    const ok = await confirm({
      title: "删除集成方",
      description: `确定要删除集成方「${item.name}」吗？集成方下仍存在 API 密钥或实例时无法删除。如不再使用，建议改为"禁用"而非删除。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteAdminIntegrationsById({ path: { id: item.id! } })
      toast.success("集成方已删除")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }, [confirm, table])

  const columns: ColumnDef<IntegrationIntegrationResponse>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "名称",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "描述",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "callback_url",
      header: "回调地址",
      cell: ({ row }) => row.original.callback_url ? (
        <span className="font-mono text-sm break-all">{row.original.callback_url}</span>
      ) : (
        <span className="text-muted-foreground text-sm">未配置</span>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => row.original.status === 1 ? (
        <Badge variant="default">启用</Badge>
      ) : (
        <Badge variant="secondary">已禁用</Badge>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setEditing(item)}
                >
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
  ], [handleDelete, formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">集成方管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          集成方是第三方系统（魔方、WHMCS 等）的稳定身份，API 密钥关联到集成方，可独立轮换而不影响业务连续性。
        </p>
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
            新建集成方
          </Button>
        }
      />

      <IntegrationCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={table.refresh}
      />
      {editing && (
        <IntegrationEditSheet
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          integration={editing}
          onSuccess={table.refresh}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
