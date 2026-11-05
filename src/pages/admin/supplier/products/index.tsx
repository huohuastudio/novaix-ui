import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, PackageOpen } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminSupplierProducts, deleteAdminSupplierProductsById } from "@/api"
import type { GetAdminSupplierProductsData, ServiceModuleProductView } from "@/api"
import {
  getAdminSupplierProductsByIdQueryKey,
  getAdminSupplierProductsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatAmount } from "@/hooks/use-site-settings"
import { useSupplierConnectionList } from "@/hooks/use-supplier-meta"
import { MODULE_CYCLES, formatModuleSpec, productStatusMap, productStatusOptions } from "@/lib/supplier-constants"
import { getErrorMessage } from "@/lib/utils"
import { ProductCreateSheet, ProductEditSheet } from "./product-form-sheet"

type ProductStatus = NonNullable<GetAdminSupplierProductsData["query"]>["status"]

const PRICE_KEYS = {
  monthly: "price_monthly",
  quarterly: "price_quarterly",
  yearly: "price_yearly",
} as const

export default function SupplierProducts() {
  useBreadcrumb([{ label: "模块商品" }])
  const queryClient = useQueryClient()
  const formatAmount = useFormatAmount()
  const { options: connectionOptions } = useSupplierConnectionList()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ServiceModuleProductView | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminSupplierProducts({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        connection_id: filters.connection_id ? Number(filters.connection_id) : undefined,
        status: (filters.status as ProductStatus) || undefined,
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
    queryKey: getAdminSupplierProductsQueryKey(),
    filterKeys: ["name", "connection_id", "status"],
  })

  const handleDelete = useCallback(async (item: ServiceModuleProductView) => {
    const ok = await confirm({
      title: "删除模块商品",
      description: `确定要删除商品「${item.name}」吗？已有购买记录的商品无法删除，可改为下架。此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteAdminSupplierProductsById({ path: { id: item.id! } })
      toast.success("商品已删除")
      queryClient.invalidateQueries({ queryKey: getAdminSupplierProductsQueryKey() })
      queryClient.invalidateQueries({ queryKey: getAdminSupplierProductsByIdQueryKey({ path: { id: item.id! } }) })
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }, [confirm, queryClient])

  const columns: ColumnDef<ServiceModuleProductView>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "名称",
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称/分类...",
      },
      cell: ({ row }) => (
        <div className="min-w-0">
          <button
            type="button"
            className="font-medium text-primary hover:underline text-left"
            onClick={() => setEditingItem(row.original)}
          >
            {row.original.name}
          </button>
          {row.original.require_kyc && (
            <Badge variant="outline" className="ml-1.5 text-2xs px-1 py-0">需实名</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "分类",
      cell: ({ row }) => row.original.category || <span className="text-muted-foreground">-</span>,
    },
    {
      id: "spec",
      header: "地域 / 规格",
      cell: ({ row }) => {
        const p = row.original
        const spec = formatModuleSpec(p)
        if (!p.region && !spec) return <span className="text-muted-foreground">-</span>
        return (
          <div className="whitespace-nowrap">
            {p.region && <div className="text-sm">{p.region}</div>}
            {spec && <div className="text-xs text-muted-foreground">{spec}</div>}
          </div>
        )
      },
    },
    {
      id: "connection_id",
      header: "连接",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "连接",
        filterOptions: connectionOptions,
      },
      cell: ({ row }) => row.original.connection_name || <span className="text-muted-foreground">-</span>,
    },
    {
      id: "prices",
      header: "售价",
      cell: ({ row }) => {
        const p = row.original
        const cycles = (p.enabled_cycles ?? "").split(",").filter(Boolean)
        const enabled = MODULE_CYCLES.filter((c) => cycles.includes(c.value))
        if (enabled.length === 0) return <span className="text-muted-foreground">-</span>
        return (
          <div className="space-y-0.5 whitespace-nowrap">
            {enabled.map((c) => (
              <div key={c.value} className="text-xs">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="ml-1.5 font-medium">{formatAmount(p[PRICE_KEYS[c.value]])}</span>
              </div>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "stock",
      header: "库存",
      cell: ({ row }) => {
        const v = row.original.stock ?? -1
        if (v === -1) return <span className="text-muted-foreground">不限</span>
        if (v === 0) return <Badge variant="destructive">售罄</Badge>
        return <span className="tabular-nums">{v}</span>
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: productStatusOptions,
      },
      cell: ({ row }) => {
        const s = productStatusMap[row.original.status ?? ""]
        return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="outline">{row.original.status}</Badge>
      },
    },
    {
      accessorKey: "service_count",
      header: "已售",
      cell: ({ row }) => <span className="tabular-nums">{row.original.service_count ?? 0}</span>,
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
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditingItem(item)}>
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
  ], [connectionOptions, formatAmount, handleDelete])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">模块商品</h1>
        <p className="mt-1 text-sm text-muted-foreground">将上游供应商的一组固定配置包装成本地商品，设置售价、周期与库存后供用户购买</p>
      </div>
      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        fetching={table.fetching}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        enableSorting={false}
        toolbar={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            添加商品
          </Button>
        }
        emptyState={
          <EmptyState
            icon={PackageOpen}
            title="暂无模块商品"
            description="先创建供应商连接，再基于连接添加商品，上架后用户即可购买"
            action={{ label: "添加商品", onClick: () => setCreateOpen(true) }}
          />
        }
      />
      <ProductCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => setCreateOpen(false)}
      />
      {editingItem && (
        <ProductEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          product={editingItem}
          onSuccess={() => setEditingItem(null)}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
