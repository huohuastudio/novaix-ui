import { useCallback, useMemo, useState } from "react"
import { Routes, Route, useNavigate } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminCoupons, deleteAdminCouponsById } from "@/api"
import type { CouponCouponItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useFormatDate, useFormatAmount, useAdminPath } from "@/hooks/use-site-settings"
import { CouponCreateSheet, CouponEditSheet } from "./coupon-form-sheet"
import CouponDetail from "./detail"

function CouponList() {
  const navigate = useNavigate()
  const adminPath = useAdminPath()
  useBreadcrumb([{ label: "优惠券管理" }])
  const formatDate = useFormatDate()
  const formatAmount = useFormatAmount()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CouponCouponItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "code" | "used_count" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminCoupons({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.code as string) || undefined,
        enabled: filters.enabled !== undefined ? filters.enabled === "true" : undefined,
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
    filterKeys: ["code", "enabled"],
  })

  const handleEdit = useCallback((item: CouponCouponItem) => {
    setEditingItem(item)
  }, [])

  const handleDelete = useCallback(async (item: CouponCouponItem) => {
    const ok = await confirm({
      title: "删除优惠券",
      description: `确定要删除优惠券「${item.code}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminCouponsById({ path: { id: item.id! } })
    table.refresh()
  }, [table, confirm])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingItem(null)
    table.refresh()
  }

  const columns: ColumnDef<CouponCouponItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "code",
      header: "优惠码",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索优惠码...",
      },
      cell: ({ row }) => (
        <button
          className="font-mono text-sm text-primary hover:underline"
          onClick={() => navigate(`${adminPath}/coupons/${row.original.id}`)}
        >
          {row.original.code}
        </button>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === "fixed" ? "固定金额" : "百分比"}
        </Badge>
      ),
    },
    {
      accessorKey: "value",
      header: "面值",
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original
        if (item.type === "fixed") return formatAmount(item.value)
        return `${((item.value ?? 0) / 100).toFixed(2)}%`
      },
    },
    {
      accessorKey: "min_order_amount",
      header: "最低消费",
      enableSorting: false,
      cell: ({ row }) => row.original.min_order_amount ? formatAmount(row.original.min_order_amount) : "-",
    },
    {
      accessorKey: "used_count",
      header: "使用量",
      enableSorting: true,
      cell: ({ row }) => {
        const limit = row.original.usage_limit
        const used = row.original.used_count ?? 0
        return limit ? `${used} / ${limit}` : `${used} / ∞`
      },
    },
    {
      accessorKey: "enabled",
      header: "状态",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: [
          { label: "启用", value: "true" },
          { label: "禁用", value: "false" },
        ],
      },
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled ? "启用" : "禁用"}
        </Badge>
      ),
    },
    {
      accessorKey: "expires_at",
      header: "过期时间",
      enableSorting: false,
      cell: ({ row }) => row.original.expires_at ? formatDate(row.original.expires_at) : "永不过期",
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
  ], [handleEdit, handleDelete, formatDate, formatAmount, navigate, adminPath])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">优惠券管理</h1>
          <HelpLink path="/novaix/coupon" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">创建和管理优惠券</p>
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
            创建优惠券
          </Button>
        }
      />
      <CouponCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
      />
      {editingItem && (
        <CouponEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          coupon={editingItem}
          onSuccess={handleFormSuccess}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}

export default function Coupons() {
  return (
    <Routes>
      <Route index element={<CouponList />} />
      <Route path=":id" element={<CouponDetail />} />
    </Routes>
  )
}
