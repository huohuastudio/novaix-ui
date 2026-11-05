import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, ClipboardCheck, FileText, Wrench } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAdminSupplierOperations } from "@/api"
import type { GetAdminSupplierOperationsData, ServiceAdminServiceOperation } from "@/api"
import { getAdminSupplierOperationsQueryKey } from "@/api/@tanstack/react-query.gen"
import { OperationLogDialog, OperationResolveDialog } from "@/components/supplier-operation-dialogs"
import { ModuleOpStatusBadge } from "@/components/supplier-badges"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useAdminPath, useFormatDate } from "@/hooks/use-site-settings"
import { useSupplierConnectionList } from "@/hooks/use-supplier-meta"
import {
  isModuleOpAttention,
  moduleOpRequesterMap,
  moduleOpStatusOptions,
  moduleOpTypeMap,
  moduleOpTypeOptions,
} from "@/lib/supplier-constants"

type OpQuery = NonNullable<GetAdminSupplierOperationsData["query"]>

const AUTO_REFRESH_INTERVAL = 10_000
// 状态筛选：空值为默认的“需要关注”（manual / unknown / failed），all 为全部
const ATTENTION_VALUE = "__attention__"

export default function SupplierOperations() {
  useBreadcrumb([{ label: "待处理" }])
  const adminPath = useAdminPath()
  const formatDate = useFormatDate()
  const { connections, options: connectionOptions } = useSupplierConnectionList()
  const connectionNames = useMemo(
    () => new Map(connections.map((c) => [c.id ?? 0, c.name ?? ""])),
    [connections],
  )
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [logId, setLogId] = useState<number | null>(null)
  const [resolving, setResolving] = useState<ServiceAdminServiceOperation | null>(null)

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminSupplierOperations({
      query: {
        page,
        page_size: pageSize,
        status: (filters.status as OpQuery["status"]) || undefined,
        type: (filters.type as OpQuery["type"]) || undefined,
        connection_id: filters.connection_id ? Number(filters.connection_id) : undefined,
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
    queryKey: getAdminSupplierOperationsQueryKey(),
    filterKeys: ["status", "type", "connection_id"],
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
  })

  const columns: ColumnDef<ServiceAdminServiceOperation>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span>,
    },
    {
      id: "service",
      header: "服务",
      cell: ({ row }) =>
        row.original.module_service_id ? (
          <Link
            to={`${adminPath}/supplier/services/${row.original.module_service_id}`}
            className="text-primary hover:underline"
          >
            服务 #{row.original.module_service_id}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "type",
      header: "类型",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "类型",
        filterOptions: moduleOpTypeOptions,
      },
      cell: ({ row }) => moduleOpTypeMap[row.original.type ?? ""] ?? row.original.type,
    },
    {
      accessorKey: "action",
      header: "动作",
      cell: ({ row }) => row.original.action
        ? <span className="font-mono text-xs">{row.original.action}</span>
        : <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "status",
      header: "状态",
      meta: {
        renderFilter: (column) => (
          <Select
            value={(column.getFilterValue() as string) || ATTENTION_VALUE}
            onValueChange={(v) => column.setFilterValue(v === ATTENTION_VALUE ? "" : v)}
          >
            <SelectTrigger className="h-8 w-[calc(50%-0.25rem)] min-w-0 sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ATTENTION_VALUE}>需要关注</SelectItem>
              <SelectItem value="all">全部状态</SelectItem>
              {moduleOpStatusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      cell: ({ row }) => <ModuleOpStatusBadge status={row.original.status} />,
    },
    {
      id: "connection_id",
      header: "连接",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "连接",
        filterOptions: connectionOptions,
      },
      cell: ({ row }) => connectionNames.get(row.original.connection_id ?? 0) ?? <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "requested_by",
      header: "发起方",
      cell: ({ row }) => moduleOpRequesterMap[row.original.requested_by ?? ""] ?? (row.original.requested_by || "-"),
    },
    {
      accessorKey: "attempt",
      header: "尝试次数",
      cell: ({ row }) => <span className="tabular-nums">{row.original.attempt ?? 0}</span>,
    },
    {
      accessorKey: "error_message",
      header: "错误信息",
      cell: ({ row }) => {
        const op = row.original
        const text = [op.error_code ? `[${op.error_code}]` : "", op.error_message ?? ""].filter(Boolean).join(" ")
        if (!text) return <span className="text-muted-foreground">-</span>
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-56 truncate text-xs text-destructive cursor-default">{text}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm break-all">{text}</TooltipContent>
          </Tooltip>
        )
      },
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
        const op = row.original
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setLogId(op.id ?? null)}>
                  <FileText className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>查看日志</TooltipContent>
            </Tooltip>
            {isModuleOpAttention(op.status) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setResolving(op)}>
                    <Wrench className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>处理</TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ], [adminPath, connectionOptions, connectionNames, formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">待处理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          供应商操作的执行记录与人工处理队列，默认展示需要关注的操作（待人工处理、结果未知、失败）
        </p>
      </div>

      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription>
          「结果未知」表示调用上游时发生超时或异常，上游可能已经执行。请先在上游后台核对实际结果，再选择标记成功、标记失败或重试，避免重复开通或重复扣费。
        </AlertDescription>
      </Alert>

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
          <div className="flex items-center gap-2">
            <Switch id="supplier-op-auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} size="sm" />
            <Label htmlFor="supplier-op-auto-refresh" className="text-sm text-muted-foreground cursor-pointer">自动刷新</Label>
          </div>
        }
        emptyState={
          <EmptyState
            icon={ClipboardCheck}
            title="没有需要处理的操作"
            description="上游调用失败或结果未知的操作会出现在这里"
          />
        }
      />

      <OperationLogDialog
        operationId={logId}
        onOpenChange={(open) => { if (!open) setLogId(null) }}
      />
      <OperationResolveDialog
        operation={resolving}
        onOpenChange={(open) => { if (!open) setResolving(null) }}
      />
    </div>
  )
}
