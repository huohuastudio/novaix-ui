import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, FolderTree, Package } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getAdminPlans,
  getAdminPlanGroups,
  deleteAdminPlansById,
} from "@/api"
import type { ProductPlanItem, ProductPlanGroupItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { EmptyState } from "@/components/empty-state"
import PlanFormDialog from "./plan-form-dialog"
import PlanGroupDialog from "./plan-group-dialog"

const activeBadgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"

function formatResource(value: number | undefined, unit: string, zeroText = "不限") {
  if (!value) return zeroText
  return `${value}${unit}`
}

export default function Plans() {
  useBreadcrumb([{ label: "套餐管理" }])
  const formatPrice = useFormatAmount()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ProductPlanItem | undefined>()
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groups, setGroups] = useState<ProductPlanGroupItem[]>([])
  const { confirm, ConfirmDialog } = useConfirm()

  const loadGroups = useCallback(() => {
    getAdminPlanGroups({ query: { page: 1, page_size: 100 } }).then(({ data: res }) => setGroups(res?.data?.items ?? []))
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  const groupNameMap = useMemo(() => {
    const m = new Map<number, string>()
    groups.forEach(g => { if (g.id != null) m.set(g.id, g.name ?? "") })
    return m
  }, [groups])

  const fetchPlans = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "name" | "cpu" | "memory" | "disk" | "price_monthly" | "status" | "sort_order" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminPlans({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        group_id: filters.group_id ? Number(filters.group_id) : undefined,
        type: (filters.type as string) || undefined,
        status: filters.status !== undefined && filters.status !== "" ? Number(filters.status) as 0 | 1 : undefined,
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
    fetchFn: fetchPlans,
    filterKeys: ["name", "status", "group_id"],
  })

  const handleCreate = () => {
    setEditingPlan(undefined)
    setDialogOpen(true)
  }

  const handleEdit = useCallback((plan: ProductPlanItem) => {
    setEditingPlan(plan)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (plan: ProductPlanItem) => {
    const ok = await confirm({
      title: "删除套餐",
      description: `确定要删除套餐「${plan.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminPlansById({ path: { id: plan.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setDialogOpen(false)
    table.refresh()
  }

  const columns: ColumnDef<ProductPlanItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "名称",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索套餐名称...",
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground mt-0.5">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      id: "group_id",
      header: "分组",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "分组",
        filterOptions: groups.map(g => ({ label: g.name ?? "", value: String(g.id) })),
      },
      cell: ({ row }) => {
        const gid = row.original.group_id
        const name = gid != null ? groupNameMap.get(gid) : undefined
        return name || <span className="text-muted-foreground">-</span>
      },
    },
    {
      id: "specs",
      header: "配置",
      cell: ({ row }) => {
        const p = row.original
        return (
          <span className="text-xs text-muted-foreground">
            {p.cpu}C / {p.memory! >= 1024 ? `${(p.memory! / 1024).toFixed(p.memory! % 1024 === 0 ? 0 : 1)}G` : `${p.memory}M`} / {p.disk}G
          </span>
        )
      },
    },
    {
      id: "network",
      header: "网络",
      cell: ({ row }) => {
        const p = row.original
        return (
          <span className="text-xs text-muted-foreground">
            {formatResource(p.bandwidth, "Mbps")} / {formatResource(p.traffic, "GB/月")}
          </span>
        )
      },
    },
    {
      accessorKey: "price_monthly",
      header: "月付",
      enableSorting: true,
      cell: ({ row }) => formatPrice(row.original.price_monthly),
    },
    {
      id: "stock",
      header: "库存",
      cell: ({ row }) => {
        const stock = row.original.stock
        if (stock === -1) return <span className="text-muted-foreground">不限</span>
        if (stock === 0) return <Badge variant="destructive">售罄</Badge>
        return stock
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
          { label: "上架", value: "1" },
          { label: "下架", value: "0" },
        ],
      },
      cell: ({ row }) => (
        row.original.status === 1
          ? <Badge className={activeBadgeClass}>上架</Badge>
          : <Badge variant="secondary">下架</Badge>
      ),
    },
    {
      accessorKey: "sort_order",
      header: "排序",
      enableSorting: true,
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const plan = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(plan)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(plan)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete, formatPrice, groups, groupNameMap])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">套餐管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">套餐定义了用户可购买的资源配置（CPU/内存/磁盘/带宽）和价格。套餐通过绑定节点组来决定在哪些节点上开通实例</p>
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(true)}>
              <FolderTree className="size-4" />
              分组管理
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              添加套餐
            </Button>
          </div>
        }
        emptyState={
          <EmptyState
            icon={Package}
            title="暂无套餐"
            description="创建套餐定义资源配置和价格，上架后用户即可购买"
            action={{ label: "添加套餐", onClick: handleCreate }}
          />
        }
      />
      <PlanFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={editingPlan}
        onSuccess={handleFormSuccess}
      />
      <PlanGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onChanged={() => { loadGroups(); table.refresh() }}
      />
      {ConfirmDialog}
    </div>
  )
}
