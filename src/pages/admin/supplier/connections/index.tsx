import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Cable, PlugZap, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  getAdminSupplierConnections,
  deleteAdminSupplierConnectionsById,
  postAdminSupplierConnectionsByIdTest,
  postAdminSupplierConnectionsByIdBalance,
} from "@/api"
import type { GetAdminSupplierConnectionsData, ServiceSupplierConnectionView } from "@/api"
import {
  getAdminSupplierConnectionsByIdQueryKey,
  getAdminSupplierConnectionsQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { hasCapability, useSupplierPlugins } from "@/hooks/use-supplier-meta"
import { connectionStatusMap, connectionStatusOptions } from "@/lib/supplier-constants"
import { getErrorMessage } from "@/lib/utils"
import { ConnectionCreateSheet, ConnectionEditSheet } from "./connection-form-sheet"

type ConnStatus = NonNullable<GetAdminSupplierConnectionsData["query"]>["status"]

export default function SupplierConnections() {
  useBreadcrumb([{ label: "供应商连接" }])
  const queryClient = useQueryClient()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const { plugins, pluginMap } = useSupplierPlugins()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ServiceSupplierConnectionView | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminSupplierConnections({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        plugin_id: (filters.plugin_id as string) || undefined,
        status: (filters.status as ConnStatus) || undefined,
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
    queryKey: getAdminSupplierConnectionsQueryKey(),
    filterKeys: ["name", "plugin_id", "status"],
  })

  // 连接数据变化后刷新列表与详情缓存
  const invalidate = useCallback((id?: number) => {
    queryClient.invalidateQueries({ queryKey: getAdminSupplierConnectionsQueryKey() })
    if (id) queryClient.invalidateQueries({ queryKey: getAdminSupplierConnectionsByIdQueryKey({ path: { id } }) })
  }, [queryClient])

  const handleTest = useCallback(async (item: ServiceSupplierConnectionView) => {
    setBusyId(item.id!)
    try {
      const { data: res } = await postAdminSupplierConnectionsByIdTest({ path: { id: item.id! } })
      const result = res?.data
      if (res?.code === 0 && result?.ok) {
        const parts = [result.message, result.balance != null ? `上游余额 ${formatAmount(result.balance)}` : ""].filter(Boolean)
        toast.success("连接测试成功", { description: parts.join("；") || undefined })
      } else {
        toast.error("连接测试失败", { description: result?.message || res?.message })
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "连接测试失败"))
    } finally {
      setBusyId(null)
      invalidate(item.id)
    }
  }, [formatAmount, invalidate])

  const handleRefreshBalance = useCallback(async (item: ServiceSupplierConnectionView) => {
    setBusyId(item.id!)
    try {
      const { data: res } = await postAdminSupplierConnectionsByIdBalance({ path: { id: item.id! } })
      if (res?.code === 0) {
        toast.success("余额已刷新", { description: `上游余额 ${formatAmount(res.data?.balance)}` })
      } else {
        toast.error(res?.message || "刷新余额失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "刷新余额失败"))
    } finally {
      setBusyId(null)
      invalidate(item.id)
    }
  }, [formatAmount, invalidate])

  const handleDelete = useCallback(async (item: ServiceSupplierConnectionView) => {
    const ok = await confirm({
      title: "删除供应商连接",
      description: `确定要删除连接「${item.name}」吗？连接下仍有商品或服务时无法删除，此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteAdminSupplierConnectionsById({ path: { id: item.id! } })
      toast.success("连接已删除")
      invalidate(item.id)
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }, [confirm, invalidate])

  const pluginOptions = useMemo(
    () => plugins.map((p) => ({ label: p.name ?? p.id ?? "", value: p.id ?? "" })),
    [plugins],
  )

  const columns: ColumnDef<ServiceSupplierConnectionView>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "名称",
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称/备注...",
      },
      cell: ({ row }) => (
        <div className="min-w-0">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setEditingItem(row.original)}
          >
            {row.original.name}
          </button>
          {row.original.remark && (
            <span className="block max-w-40 truncate text-xs text-muted-foreground" title={row.original.remark}>
              {row.original.remark}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "plugin_id",
      header: "插件",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "插件",
        filterOptions: pluginOptions,
      },
      cell: ({ row }) => (
        <span className="text-sm">{row.original.plugin_name || row.original.plugin_id}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: connectionStatusOptions,
      },
      cell: ({ row }) => {
        const s = connectionStatusMap[row.original.status ?? ""]
        return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="outline">{row.original.status}</Badge>
      },
    },
    {
      id: "balance",
      header: "上游余额",
      cell: ({ row }) => {
        const c = row.original
        if (!c.balance_checked_at) return <span className="text-muted-foreground">-</span>
        const low = (c.balance_alert_threshold ?? 0) > 0 && (c.balance ?? 0) < (c.balance_alert_threshold ?? 0)
        return (
          <div>
            <div className={low ? "font-medium text-destructive" : "font-medium"}>{formatAmount(c.balance)}</div>
            <div className="text-xs text-muted-foreground">{formatDate(c.balance_checked_at)}</div>
          </div>
        )
      },
    },
    {
      id: "counts",
      header: "商品 / 服务",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.product_count ?? 0} / {row.original.service_count ?? 0}</span>
      ),
    },
    {
      accessorKey: "last_error",
      header: "最近错误",
      cell: ({ row }) => {
        const err = row.original.last_error
        if (!err) return <span className="text-muted-foreground">-</span>
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-48 truncate text-xs text-destructive cursor-default">{err}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm break-all">{err}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original
        const busy = busyId === item.id
        const canBalance = hasCapability(pluginMap.get(item.plugin_id ?? ""), "balance")
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" disabled={busy} onClick={() => handleTest(item)}>
                  <PlugZap className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>测试连接</TooltipContent>
            </Tooltip>
            {canBalance && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" disabled={busy} onClick={() => handleRefreshBalance(item)}>
                    <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>刷新余额</TooltipContent>
              </Tooltip>
            )}
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
  ], [pluginOptions, pluginMap, busyId, formatAmount, formatDate, handleTest, handleRefreshBalance, handleDelete])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">供应商连接</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理上游供应商的接入信息，连接是创建模块商品和开通服务的基础</p>
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
            新建连接
          </Button>
        }
        emptyState={
          <EmptyState
            icon={Cable}
            title="暂无供应商连接"
            description="添加上游供应商的接入信息后，即可基于该连接创建模块商品"
            action={{ label: "新建连接", onClick: () => setCreateOpen(true) }}
          />
        }
      />
      <ConnectionCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => setCreateOpen(false)}
      />
      {editingItem && (
        <ConnectionEditSheet
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          connection={editingItem}
          onSuccess={() => setEditingItem(null)}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
