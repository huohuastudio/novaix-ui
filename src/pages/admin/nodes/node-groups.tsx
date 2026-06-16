import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, Server } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getAdminNodeGroups,
  deleteAdminNodeGroupsById,
} from "@/api"
import type { NodeGroupNodeGroupItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import NodeGroupFormDialog from "../node-groups/node-group-form-dialog"
import NodeGroupNodesDialog from "../node-groups/node-group-nodes-dialog"

const storageBackendMap: Record<string, string> = {
  local: "本地存储",
  ceph: "Ceph",
}

export default function NodeGroups() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NodeGroupNodeGroupItem | undefined>()
  const [nodesDialogGroup, setNodesDialogGroup] = useState<NodeGroupNodeGroupItem | undefined>()
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchGroups = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminNodeGroups({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
      },
    })
    return {
      items: res?.data?.items ?? [],
      total: res?.data?.total ?? 0,
      page: res?.data?.page ?? 1,
      page_size: res?.data?.page_size ?? pageSize,
    }
  }, [])

  const table = useDataTable({ fetchFn: fetchGroups, filterKeys: ["name"] })

  const handleCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const handleEdit = useCallback((g: NodeGroupNodeGroupItem) => {
    setEditing(g)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(async (g: NodeGroupNodeGroupItem) => {
    const ok = await confirm({
      title: "删除节点组",
      description: `确定要删除节点组「${g.name}」吗？组内不能有节点。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminNodeGroupsById({ path: { id: g.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setFormOpen(false)
    table.refresh()
  }

  const columns: ColumnDef<NodeGroupNodeGroupItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "名称",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
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
      accessorKey: "storage_backend",
      header: "存储后端",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {storageBackendMap[row.original.storage_backend ?? ""] ?? row.original.storage_backend}
        </Badge>
      ),
    },
    {
      accessorKey: "cluster_mode",
      header: "集群模式",
      cell: ({ row }) => (
        row.original.cluster_mode
          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">已启用</Badge>
          : <Badge variant="secondary">未启用</Badge>
      ),
    },
    {
      accessorKey: "ha_enabled",
      header: "高可用",
      cell: ({ row }) => (
        row.original.ha_enabled
          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">已启用</Badge>
          : <Badge variant="secondary">未启用</Badge>
      ),
    },
    {
      accessorKey: "node_count",
      header: "节点数",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          className="h-auto p-0 font-normal hover:underline"
          onClick={() => setNodesDialogGroup(row.original)}
        >
          <Server className="size-3.5 mr-1" />
          {row.original.node_count ?? 0}
        </Button>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const g = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(g)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(g)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete])

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
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            创建节点组
          </Button>
        }
      />
      <NodeGroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editing}
        onSuccess={handleFormSuccess}
      />
      <NodeGroupNodesDialog
        group={nodesDialogGroup}
        onClose={() => setNodesDialogGroup(undefined)}
        onChanged={() => table.refresh()}
      />
      {ConfirmDialog}
    </>
  )
}
