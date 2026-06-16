import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getAdminTrafficPackages,
  deleteAdminTrafficPackagesById,
} from "@/api"
import type { TrafficPackageTrafficPackageItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { trafficPackageTypeMap } from "@/lib/traffic-package-constants"
import TrafficPackageFormDialog from "./traffic-package-form-dialog"

const activeBadgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"

export default function TrafficPackages() {
  useBreadcrumb([{ label: "流量包管理" }])
  const formatPrice = useFormatAmount()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TrafficPackageTrafficPackageItem | undefined>()
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchPackages = useCallback(async ({ page, pageSize }: FetchParams) => {
    const { data: res } = await getAdminTrafficPackages({
      query: { page, page_size: pageSize },
    })
    return {
      items: res?.data?.items ?? [],
      total: res?.data?.total ?? 0,
      page: res?.data?.page ?? 1,
      page_size: res?.data?.page_size ?? pageSize,
    }
  }, [])

  const table = useDataTable({ fetchFn: fetchPackages })

  const handleCreate = () => {
    setEditing(undefined)
    setDialogOpen(true)
  }

  const handleEdit = useCallback((pkg: TrafficPackageTrafficPackageItem) => {
    setEditing(pkg)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (pkg: TrafficPackageTrafficPackageItem) => {
    const ok = await confirm({
      title: "删除流量包",
      description: `确定要删除流量包「${pkg.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminTrafficPackagesById({ path: { id: pkg.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setDialogOpen(false)
    table.refresh()
  }

  const columns: ColumnDef<TrafficPackageTrafficPackageItem>[] = useMemo(() => [
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
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => (
        <Badge variant="secondary">{trafficPackageTypeMap[row.original.type ?? ""] ?? row.original.type}</Badge>
      ),
    },
    {
      accessorKey: "traffic",
      header: "流量",
      cell: ({ row }) => (
        row.original.type === "reset"
          ? <span className="text-muted-foreground">-</span>
          : `${row.original.traffic} GB`
      ),
    },
    {
      accessorKey: "price",
      header: "价格",
      cell: ({ row }) => formatPrice(row.original.price),
    },
    {
      id: "plans",
      header: "限定套餐",
      cell: ({ row }) => {
        const ids = (row.original.plan_ids ?? "").split(",").map((s) => s.trim()).filter(Boolean)
        return ids.length > 0
          ? <span className="text-xs text-muted-foreground">{ids.length} 个套餐</span>
          : <span className="text-muted-foreground">全部</span>
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        row.original.status === 1
          ? <Badge className={activeBadgeClass}>启用</Badge>
          : <Badge variant="secondary">禁用</Badge>
      ),
    },
    {
      accessorKey: "sort_order",
      header: "排序",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const pkg = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(pkg)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(pkg)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete, formatPrice])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">流量包管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">配置可供用户加购的流量包</p>
      </div>
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
            添加流量包
          </Button>
        }
      />
      <TrafficPackageFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pkg={editing}
        onSuccess={handleFormSuccess}
      />
      {ConfirmDialog}
    </div>
  )
}
