import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { getAdminInstances, postAdminInstancesByIdRenew } from "@/api"
import type { InstanceInstanceItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useInstanceActions } from "@/hooks/use-instance-actions"
import { useConfirm as useConfirmRenew } from "@/hooks/use-confirm"
import InstanceRetryDialog from "@/components/instance-retry-dialog"
import { InstanceEditSheet } from "@/components/instance-edit-sheet"
import { InstanceActionCell } from "@/components/instance-action-cell"
import { statusMap, statusFilterOptions, typeFilterOptions } from "@/lib/instance-constants"
import { NodePopover } from "@/components/node-popover"
import { EmptyState } from "@/components/empty-state"
import { MonitorCog } from "lucide-react"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { getErrorMessage } from "@/lib/utils"

interface InstanceTableProps {
  toolbar?: React.ReactNode
  tourId?: string
}

export default function InstanceTable({ toolbar, tourId }: InstanceTableProps) {
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const [retryInstance, setRetryInstance] = useState<InstanceInstanceItem | null>(null)
  const { confirm: confirmRenew, ConfirmDialog: RenewConfirmDialog } = useConfirmRenew()
  const [editInstanceId, setEditInstanceId] = useState<number | null>(null)

  const fetchInstances = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "name" | "status" | "type" | "cpu" | "memory" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminInstances({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
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
  }, [])

  const table = useDataTable({
    fetchFn: fetchInstances,
    filterKeys: ["name", "status", "type"],
  })

  const { handleDelete, handlePowerAction, loadingId, ConfirmDialog } = useInstanceActions(table.refresh)

  const handleRenew = useCallback(async (inst: InstanceInstanceItem) => {
    const cycle = inst.billing_cycle || "monthly"
    if (cycle === "hourly") {
      toast.error("按小时计费实例不支持续费")
      return
    }
    const cycleLabel = cycle === "yearly" ? "年付" : cycle === "quarterly" ? "季付" : "月付"
    const ok = await confirmRenew({
      title: "续费实例",
      description: `确定要为实例「${inst.name}」续费一个${cycleLabel}周期吗？将从用户余额扣费。`,
      confirmText: "确认续费",
    })
    if (!ok) return
    try {
      const { data: res } = await postAdminInstancesByIdRenew({
        path: { id: inst.id! },
        body: { billing_cycle: cycle, auto_pay: true },
      })
      if (res?.code === 0) {
        toast.success("续费成功")
        table.refresh()
      } else {
        toast.error(res?.message ?? "续费失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "续费失败"))
    }
  }, [confirmRenew, table])

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
        <Link to={`${adminPath}/instances/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "node_name",
      header: "宿主机",
      cell: ({ row }) => (
        <NodePopover nodeId={row.original.node_id} label={row.original.node_name} />
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
      cell: ({ row }) => row.original.ip_address || <span className="text-muted-foreground">-</span>,
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
          onRenew={handleRenew}
        />
      ),
    },
  ], [handleDelete, handlePowerAction, handleRenew, loadingId, formatDate, adminPath])

  return (
    <>
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
        toolbar={toolbar}
        tourId={tourId}
        emptyState={
          <EmptyState
            icon={MonitorCog}
            title="暂无实例"
            description="用户下单后系统会自动创建实例，也可以在此手动创建"
          />
        }
      />
      {ConfirmDialog}
      {RenewConfirmDialog}
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
