import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table"
import { getAdminLogs } from "@/api"
import type { LogLogItem } from "@/api"
import { DataTable, type PaginatedData } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useFormatDate } from "@/hooks/use-site-settings"
import { actionMap } from "@/pages/admin/logs/constants"

const targetPrefixMap: Record<string, string> = {
  user: "用户",
  node: "节点",
  instance: "实例",
  order: "订单",
  announcement: "公告",
  setting: "设置",
  coupon: "优惠券",
  api_key: "API 密钥",
  iso: "ISO",
  integration: "集成",
  vpc: "VPC",
  rdns: "rDNS",
}

function formatTarget(target?: string) {
  if (!target) return "-"
  const idx = target.indexOf(":")
  if (idx === -1) return target
  const prefix = target.slice(0, idx)
  const id = target.slice(idx + 1)
  return `${targetPrefixMap[prefix] ?? prefix} #${id}`
}

export function LogsTab({ userId }: { userId: number }) {
  const formatDate = useFormatDate()
  const [data, setData] = useState<PaginatedData<LogLogItem>>()
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
      const { data: res } = await getAdminLogs({
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

  const columns: ColumnDef<LogLogItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "action",
      header: "操作",
      cell: ({ row }) => {
        const a = actionMap[row.original.action ?? ""]
        return a
          ? <Badge variant={a.variant}>{a.label}</Badge>
          : <span className="text-xs">{row.original.action || "-"}</span>
      },
    },
    {
      accessorKey: "target",
      header: "目标",
      cell: ({ row }) => (
        <span className="text-xs">{formatTarget(row.original.target)}</span>
      ),
    },
    {
      accessorKey: "detail",
      header: "详情",
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[300px] truncate block text-xs">
          {row.original.detail || "-"}
        </span>
      ),
    },
    {
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.ip || "-"}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ], [formatDate])

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
