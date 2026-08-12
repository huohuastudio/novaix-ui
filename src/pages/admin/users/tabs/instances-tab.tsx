import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { Monitor } from "lucide-react"
import type { InstanceInstanceItem } from "@/api"
import { getAdminInstances } from "@/api"
import { getAdminInstancesQueryKey } from "@/api/@tanstack/react-query.gen"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { statusMap } from "@/lib/instance-constants"
import { formatMemory, formatDisk } from "@/lib/utils"

export function InstancesTab({ userId }: { userId: number }) {
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()

  const fetchInstances = useCallback(async ({ page, pageSize, sorting }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
    const { data: res } = await getAdminInstances({
      query: { user_id: userId, page, page_size: pageSize, sort, order },
    })
    if (!res || res.code !== 0) throw new Error(res?.message || "请求失败")
    return {
      items: res.data?.items ?? [],
      total: res.data?.total ?? 0,
      page: res.data?.page ?? 1,
      page_size: res.data?.page_size ?? pageSize,
    }
  }, [userId])

  // user_id 是真实接口参数，随 queryKey 区分不同用户的缓存；嵌入 tab 场景不同步 URL
  const table = useDataTable<InstanceInstanceItem>({
    fetchFn: fetchInstances,
    queryKey: getAdminInstancesQueryKey({ query: { user_id: userId } }),
    syncUrl: false,
  })

  const columns: ColumnDef<InstanceInstanceItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "名称",
      cell: ({ row }) => (
        <Link
          to={`${adminPath}/instances/${row.original.id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.original.name || "-"}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statusMap[row.original.status ?? ""] ?? { label: row.original.status, variant: "outline" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      accessorKey: "ip_address",
      header: "IP",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.ip_address || "-"}</span>
      ),
    },
    {
      accessorKey: "cpu",
      header: "CPU",
      cell: ({ row }) => `${row.original.cpu ?? 0} 核`,
    },
    {
      accessorKey: "memory",
      header: "内存",
      cell: ({ row }) => formatMemory(row.original.memory ?? 0),
    },
    {
      accessorKey: "disk",
      header: "磁盘",
      cell: ({ row }) => formatDisk(row.original.disk ?? 0),
    },
    {
      accessorKey: "node_name",
      header: "节点",
    },
    {
      accessorKey: "created_at",
      header: "创建时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ], [formatDate, adminPath])

  return (
    <DataTable
      columns={columns}
      data={table.data}
      loading={table.loading}
      fetching={table.fetching}
      error={table.error}
      enableSorting={false}
      pagination={table.pagination}
      onPaginationChange={table.setPagination}
      sorting={table.sorting}
      onSortingChange={table.setSorting}
      emptyIcon={Monitor}
      emptyTitle="暂无实例"
      emptyDescription="该用户还没有云服务器"
    />
  )
}
