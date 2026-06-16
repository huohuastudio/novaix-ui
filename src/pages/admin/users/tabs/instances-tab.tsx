import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table"
import { getAdminInstances } from "@/api"
import type { InstanceInstanceItem } from "@/api"
import { DataTable, type PaginatedData } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { statusMap } from "@/lib/instance-constants"
import { formatMemory, formatDisk } from "@/lib/utils"

export function InstancesTab({ userId }: { userId: number }) {
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const [data, setData] = useState<PaginatedData<InstanceInstanceItem>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const sort = sorting[0]?.id as "id" | "created_at" | undefined
      const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
      const { data: res } = await getAdminInstances({
        query: {
          user_id: userId,
          page: pagination.pageIndex + 1,
          page_size: pagination.pageSize,
          sort,
          order,
        },
      })
      if (res?.code !== 0) {
        setError(new Error(res?.message || "请求失败"))
        return
      }
      setData({
        items: res?.data?.items ?? [],
        total: res?.data?.total ?? 0,
        page: res?.data?.page ?? 1,
        page_size: res?.data?.page_size ?? pagination.pageSize,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("请求失败"))
    } finally {
      setLoading(false)
    }
  }, [userId, pagination, sorting])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
    fetchData()
  }, [fetchData])

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
      data={data}
      loading={loading}
      error={error}
      enableSorting={false}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  )
}
