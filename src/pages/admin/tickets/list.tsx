import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2, MessageSquareText } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminTickets, deleteAdminTicketsById } from "@/api"
import type { TicketTicketItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { useTicketMeta } from "@/hooks/use-ticket-meta"
import { UserPopover } from "@/components/user-popover"
import { getSLAStatus, slaStatusConfig } from "@/lib/ticket-constants"
import { statusMap, priorityMap } from "./constants"

export default function TicketList() {
  useBreadcrumb([{ label: "工单管理" }])
  const navigate = useNavigate()
  const adminPath = useAdminPath()
  const formatDate = useFormatDate()
  const { confirm, ConfirmDialog } = useConfirm()

  const { departments, staffUsers } = useTicketMeta()

  const fetchData = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "priority" | "status" | "created_at" | "last_reply_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminTickets({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.subject as string) || undefined,
        status: (filters.status as "open" | "replied" | "user_reply" | "closed") || undefined,
        priority: filters.priority !== undefined ? Number(filters.priority) as 0 | 1 | 2 : undefined,
        department: (filters.department as string) || undefined,
        assignee_id: filters.assignee_id ? Number(filters.assignee_id) : undefined,
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
    fetchFn: fetchData,
    filterKeys: ["subject", "status", "priority", "department", "assignee_id"],
  })

  const handleDelete = useCallback(async (item: TicketTicketItem) => {
    const ok = await confirm({
      title: "删除工单",
      description: `确定要删除工单「${item.subject}」及其所有回复吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminTicketsById({ path: { id: item.id! } })
    table.refresh()
  }, [table, confirm])

  const columns: ColumnDef<TicketTicketItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
      size: 60,
    },
    {
      accessorKey: "subject",
      header: "标题",
      enableSorting: false,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索标题...",
      },
      cell: ({ row }) => {
        const item = row.original
        return (
          <button
            className="text-left text-primary hover:underline cursor-pointer truncate max-w-xs"
            onClick={() => navigate(`${adminPath}/tickets/${item.id}`)}
          >
            {item.subject}
          </button>
        )
      },
    },
    {
      accessorKey: "username",
      header: "提交用户",
      cell: ({ row }) => (
        <UserPopover userId={row.original.user_id} username={row.original.username} />
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: [
          { label: "待处理", value: "open" },
          { label: "已回复", value: "replied" },
          { label: "用户回复", value: "user_reply" },
          { label: "已关闭", value: "closed" },
        ],
      },
      cell: ({ row }) => {
        const s = statusMap[row.getValue("status") as string]
        return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.getValue("status")
      },
    },
    {
      accessorKey: "priority",
      header: "优先级",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "优先级",
        filterOptions: [
          { label: "低", value: "0" },
          { label: "中", value: "1" },
          { label: "高", value: "2" },
        ],
      },
      cell: ({ row }) => {
        const p = priorityMap[row.getValue("priority") as number]
        return p ? <Badge variant={p.variant}>{p.label}</Badge> : row.getValue("priority")
      },
    },
    ...(departments.length > 0 ? [{
      accessorKey: "department",
      header: "部门",
      enableSorting: false,
      meta: {
        filterVariant: "select" as const,
        filterPlaceholder: "部门",
        filterOptions: departments.map((d) => ({ label: d, value: d })),
      },
      cell: ({ row }: { row: { original: TicketTicketItem } }) => row.original.department || "-",
    } satisfies ColumnDef<TicketTicketItem>] : []),
    {
      accessorKey: "assignee_name",
      header: "指派人",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "指派人",
        filterOptions: staffUsers.map((u) => ({ label: u.username ?? "", value: String(u.id) })),
        filterKey: "assignee_id",
      },
      cell: ({ row }) => row.original.assignee_name || "-",
    },
    {
      id: "sla",
      header: "SLA",
      enableSorting: false,
      cell: ({ row }) => {
        const deadline = row.original.sla_deadline
        if (!deadline) return "-"
        const status = getSLAStatus(deadline)
        const cfg = slaStatusConfig[status]
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      accessorKey: "reply_count",
      header: "回复",
      enableSorting: false,
      size: 60,
    },
    {
      accessorKey: "last_reply_at",
      header: "最后回复",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.last_reply_at) || "-",
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
      size: 60,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>删除</TooltipContent>
        </Tooltip>
      ),
    },
  ], [navigate, handleDelete, formatDate, adminPath, departments, staffUsers])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">工单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看和处理用户提交的工单</p>
      </div>
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
        emptyState={
          <EmptyState
            icon={MessageSquareText}
            title="暂无工单"
            description="用户提交的工单会显示在这里"
          />
        }
      />
      {ConfirmDialog}
    </div>
  )
}
