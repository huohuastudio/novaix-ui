import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAdminInstances } from "@/api"
import type { InstanceInstanceItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useInstanceActions } from "@/hooks/use-instance-actions"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import InstanceRetryDialog from "@/components/instance-retry-dialog"
import { InstanceEditSheet } from "@/components/instance-edit-sheet"
import { InstanceActionCell } from "@/components/instance-action-cell"
import { statusMap, statusFilterOptions, typeFilterOptions } from "@/lib/instance-constants"
import { getAdminInstancesQueryKey } from "@/api/@tanstack/react-query.gen"

interface NodeInstanceTableProps {
  nodeId: number
  toolbar?: React.ReactNode
}

export default function NodeInstanceTable({ nodeId, toolbar }: NodeInstanceTableProps) {
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const [retryInstance, setRetryInstance] = useState<InstanceInstanceItem | null>(null)
  const [editInstanceId, setEditInstanceId] = useState<number | null>(null)

  const fetchInstances = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "name" | "status" | "type" | "cpu" | "memory" | "created_at" | "traffic_used" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminInstances({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        node_id: nodeId,
        status: (filters.status as "stopped" | "running" | "frozen" | "error" | "creating") || undefined,
        type: (filters.type as "virtual-machine" | "container") || undefined,
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
  }, [nodeId])

  const table = useDataTable({
    fetchFn: fetchInstances,
    // node_id 是接口 query 参数，传入生成 key，避免切换节点时命中旧缓存
    queryKey: getAdminInstancesQueryKey({ query: { node_id: nodeId } }),
    filterKeys: ["name", "status", "type"],
  })

  const { handleDelete, handlePowerAction, loadingId, ConfirmDialog } = useInstanceActions(table.refresh)

  const columns: ColumnDef<InstanceInstanceItem>[] = useMemo(() => [
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
        filterPlaceholder: "搜索名称/主机名/IP...",
      },
      cell: ({ row }) => (
        <Link to={`${adminPath}/instances/${row.original.id}`} className="font-medium text-primary hover:underline">{row.original.name}</Link>
      ),
    },
    {
      accessorKey: "traffic_used",
      header: "已用流量",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => (
        <div className="tabular-nums whitespace-nowrap">
          <div>{(row.original.traffic_used ?? 0).toFixed(2)} GB</div>
          <div className="text-xs text-muted-foreground">
            {row.original.traffic_limit
              ? `配额 ${row.original.traffic_limit + (row.original.traffic_extra ?? 0)} GB`
              : "不限量"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "类型",
        filterOptions: typeFilterOptions,
      },
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === "virtual-machine" ? "虚拟机" : "容器"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: statusFilterOptions,
      },
      cell: ({ row }) => {
        const status = row.original.status ?? "stopped"
        const info = statusMap[status] ?? { label: "未知", variant: "outline" as const }
        return <Badge variant={info.variant}>{info.label}</Badge>
      },
    },
    {
      id: "resources",
      header: "配置",
      cell: ({ row }) => {
        const i = row.original
        return (
          <div className="text-xs text-muted-foreground">
            {i.cpu}C / {i.memory}MB / {i.disk}GB
          </div>
        )
      },
    },
    {
      accessorKey: "ip_address",
      header: "IP 地址",
      cell: ({ row }) => row.original.ip_address || row.original.ipv6_address || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "username",
      header: "所属用户",
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={`${adminPath}/users/${row.original.user_id}`} className="text-primary hover:underline">
          {row.original.username || `#${row.original.user_id}`}
        </Link>
      ),
    },
    {
      accessorKey: "os_type",
      header: "系统",
      cell: ({ row }) => row.original.os_type || <span className="text-muted-foreground">-</span>,
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
      cell: ({ row }) => (
        <InstanceActionCell
          instance={row.original}
          busy={loadingId === row.original.id}
          onPowerAction={handlePowerAction}
          onEdit={(inst) => setEditInstanceId(inst.id!)}
          onDelete={handleDelete}
          onRetry={(inst) => setRetryInstance(inst)}
        />
      ),
    },
  ], [handleDelete, handlePowerAction, loadingId, formatDate, adminPath])

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">统计本月已用流量；手动重置后从重置点计算，用量随系统采集更新。</p>
      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        fetching={table.fetching}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        toolbar={<div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => table.setSorting([{ id: "traffic_used", desc: true }])}>流量排行</Button>
          {toolbar}
        </div>}
      />
      {ConfirmDialog}
      <InstanceRetryDialog
        instance={retryInstance}
        onOpenChange={(open) => { if (!open) setRetryInstance(null) }}
        onSuccess={table.refresh}
      />
      <InstanceEditSheet
        open={editInstanceId !== null}
        onOpenChange={(open) => { if (!open) setEditInstanceId(null) }}
        instanceId={editInstanceId}
        onSuccess={() => { setEditInstanceId(null); table.refresh() }}
      />
    </>
  )
}
