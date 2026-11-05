import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { Boxes } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { UserPopover } from "@/components/user-popover"
import { ModuleServiceStatusBadge } from "@/components/supplier-badges"
import { getAdminSupplierServices } from "@/api"
import type { GetAdminSupplierServicesData, ServiceAdminModuleService } from "@/api"
import { getAdminSupplierServicesQueryKey } from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useAdminPath, useFormatDate } from "@/hooks/use-site-settings"
import { useSupplierConnectionList, useSupplierProductList } from "@/hooks/use-supplier-meta"
import {
  isModuleOpActive,
  moduleOpStatusMap,
  moduleOpTypeMap,
  moduleServiceStatusOptions,
  suspendReasonMap,
} from "@/lib/supplier-constants"

type ServiceStatus = NonNullable<GetAdminSupplierServicesData["query"]>["status"]

// 列表只显示日期部分，悬停查看完整时间
function DateOnly({ text }: { text: string }) {
  return <span title={text}>{text.split(" ")[0]}</span>
}

export default function SupplierServices() {
  useBreadcrumb([{ label: "服务管理" }])
  const adminPath = useAdminPath()
  const formatDate = useFormatDate()
  const { options: connectionOptions } = useSupplierConnectionList()
  const { options: productOptions } = useSupplierProductList()

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminSupplierServices({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        status: (filters.status as ServiceStatus) || undefined,
        connection_id: filters.connection_id ? Number(filters.connection_id) : undefined,
        product_id: filters.product_id ? Number(filters.product_id) : undefined,
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
    queryKey: getAdminSupplierServicesQueryKey(),
    filterKeys: ["name", "status", "connection_id", "product_id"],
  })

  const columns: ColumnDef<ServiceAdminModuleService>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "名称",
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称/引用/远端 ID...",
      },
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link to={`${adminPath}/supplier/services/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.name || `服务 #${row.original.id}`}
          </Link>
          {row.original.reference && (
            <span className="block max-w-44 truncate font-mono text-xs text-muted-foreground" title={row.original.reference}>
              {row.original.reference}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "username",
      header: "用户",
      cell: ({ row }) => <UserPopover userId={row.original.user_id} username={row.original.username} />,
    },
    {
      id: "product_id",
      header: "商品",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "商品",
        filterOptions: productOptions,
      },
      cell: ({ row }) => row.original.product_name || <span className="text-muted-foreground">-</span>,
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
      accessorKey: "status",
      header: "状态",
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: moduleServiceStatusOptions,
      },
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="space-y-0.5">
            <ModuleServiceStatusBadge status={s.status} reason={s.suspend_reason} />
            {s.status === "suspended" && s.suspend_reason && (
              <div className="text-xs text-muted-foreground">{suspendReasonMap[s.suspend_reason] ?? s.suspend_reason}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "expire_at",
      header: "到期时间",
      cell: ({ row }) => row.original.expire_at
        ? <DateOnly text={formatDate(row.original.expire_at)} />
        : <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "remote_id",
      header: "远端 ID",
      cell: ({ row }) => row.original.remote_id
        ? <span className="block max-w-32 truncate font-mono text-xs" title={row.original.remote_id}>{row.original.remote_id}</span>
        : <span className="text-muted-foreground">-</span>,
    },
    {
      id: "active_operation",
      header: "当前操作",
      cell: ({ row }) => {
        const op = row.original.active_operation
        if (!op) return <span className="text-muted-foreground">-</span>
        const st = moduleOpStatusMap[op.status ?? ""]
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
            {isModuleOpActive(op.status) && <Spinner size="sm" />}
            <span>{moduleOpTypeMap[op.type ?? ""] ?? op.type}{op.action ? ` · ${op.action}` : ""}</span>
            {st && <Badge variant={st.variant} className="text-2xs px-1 py-0">{st.label}</Badge>}
          </div>
        )
      },
    },
  ], [adminPath, connectionOptions, productOptions, formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">服务管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">用户购买模块商品后开通的服务，可查看状态、同步上游并执行运维操作</p>
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
        emptyState={
          <EmptyState
            icon={Boxes}
            title="暂无服务"
            description="用户购买模块商品后，开通的服务会显示在这里"
          />
        }
      />
    </div>
  )
}
