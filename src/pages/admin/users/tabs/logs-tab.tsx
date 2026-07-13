import { useCallback, useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { LogLogItem } from "@/api"
import { getAdminLogs } from "@/api"
import { getAdminLogsQueryKey } from "@/api/@tanstack/react-query.gen"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatDate } from "@/hooks/use-site-settings"
import { actionMap } from "@/pages/admin/logs/constants"

const targetPrefixMap: Record<string, string> = {
  user: "用户",
  node: "节点",
  instance: "实例",
  order: "订单",
  article: "文章",
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

  const fetchLogs = useCallback(async ({ page, pageSize, sorting }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined
    const { data: res } = await getAdminLogs({
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
  const table = useDataTable<LogLogItem>({
    fetchFn: fetchLogs,
    queryKey: getAdminLogsQueryKey({ query: { user_id: userId } }),
    syncUrl: false,
  })

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
      data={table.data}
      loading={table.loading}
      fetching={table.fetching}
      error={table.error}
      enableSorting={false}
      pagination={table.pagination}
      onPaginationChange={table.setPagination}
      sorting={table.sorting}
      onSortingChange={table.setSorting}
    />
  )
}
