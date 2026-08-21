import { useCallback, useMemo, useState, type FormEvent } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UserPlus, Check, X } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getAdminAgentApplications,
  postAdminAgentApplicationsByIdApprove,
  postAdminAgentApplicationsByIdReject,
} from "@/api"
import type { AgentApplicationItem, AgentGroupItem } from "@/api"
import { getAdminAgentApplicationsQueryKey, getAdminAgentApplicationsPendingCountQueryKey, getAdminAgentGroupsOptions, getAdminAgentsQueryKey } from "@/api/@tanstack/react-query.gen"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatDate } from "@/hooks/use-site-settings"
import { useSettings } from "@/hooks/use-settings"
import { getErrorMessage } from "@/lib/utils"
import { UserPopover } from "@/components/user-popover"
import { useQuery, useQueryClient } from "@tanstack/react-query"

const NO_GROUP = "none"

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待审核", variant: "default" },
  approved: { label: "已通过", variant: "secondary" },
  rejected: { label: "已拒绝", variant: "destructive" },
}

export default function AgentApplications() {
  const formatDate = useFormatDate()
  const queryClient = useQueryClient()
  const [approveItem, setApproveItem] = useState<AgentApplicationItem | null>(null)
  const [approveGroup, setApproveGroup] = useState(NO_GROUP)
  const [approveSaving, setApproveSaving] = useState(false)
  const [rejectItem, setRejectItem] = useState<AgentApplicationItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectSaving, setRejectSaving] = useState(false)

  const groupsQuery = useQuery(getAdminAgentGroupsOptions())
  const groups = useMemo<AgentGroupItem[]>(() => groupsQuery.data?.data ?? [], [groupsQuery.data])
  const { data: agentSettings, loading: settingsLoading } = useSettings("agent")
  const defaultRate = Number(agentSettings.agent_default_commission_rate) || 10

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminAgentApplications({
      query: {
        page,
        page_size: pageSize,
        status: (filters.status as string) || undefined,
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
    queryKey: getAdminAgentApplicationsQueryKey(),
    filterKeys: ["status"],
  })

  const handleApprove = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!approveItem) return
    const form = new FormData(e.currentTarget)
    setApproveSaving(true)
    try {
      const { data: res } = await postAdminAgentApplicationsByIdApprove({
        path: { id: approveItem.id! },
        body: {
          commission_rate: Number(form.get("commission_rate")),
          commission_rate_recurring: Number(form.get("commission_rate_recurring")),
          agent_group_id: approveGroup === NO_GROUP ? 0 : Number(approveGroup),
        },
      })
      if (res?.code === 0) {
        toast.success("已通过申请")
        setApproveItem(null)
        table.refresh()
        queryClient.invalidateQueries({ queryKey: getAdminAgentsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getAdminAgentApplicationsPendingCountQueryKey() })
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setApproveSaving(false)
    }
  }, [approveItem, approveGroup, table, queryClient])

  const handleReject = useCallback(async () => {
    if (!rejectItem) return
    setRejectSaving(true)
    try {
      const { data: res } = await postAdminAgentApplicationsByIdReject({
        path: { id: rejectItem.id! },
        body: { reason: rejectReason },
      })
      if (res?.code === 0) {
        toast.success("已拒绝申请")
        setRejectItem(null)
        setRejectReason("")
        table.refresh()
        queryClient.invalidateQueries({ queryKey: getAdminAgentApplicationsPendingCountQueryKey() })
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    } finally {
      setRejectSaving(false)
    }
  }, [rejectItem, rejectReason, table, queryClient])

  const columns: ColumnDef<AgentApplicationItem>[] = useMemo(() => [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "username",
      header: "用户",
      cell: ({ row }) => (
        <UserPopover userId={row.original.user_id} username={row.original.username} />
      ),
    },
    { accessorKey: "email", header: "邮箱" },
    {
      accessorKey: "status",
      header: "状态",
      meta: {
        filterVariant: "select",
        filterOptions: [
          { value: "pending", label: "待审核" },
          { value: "approved", label: "已通过" },
          { value: "rejected", label: "已拒绝" },
        ],
      },
      cell: ({ row }) => {
        const s = statusMap[row.original.status ?? ""] ?? { label: row.original.status, variant: "outline" as const }
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      accessorKey: "remark",
      header: "备注",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.remark || "-"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "申请时间",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original
        if (item.status !== "pending") return null
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-green-600 hover:text-green-600"
                  onClick={() => {
                    setApproveGroup(NO_GROUP)
                    setApproveItem(item)
                  }}
                >
                  <Check className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>通过</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setRejectReason("")
                    setRejectItem(item)
                  }}
                >
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>拒绝</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ], [formatDate])

  return (
    <>
      <DataTable
        columns={columns}
        data={table.data}
        loading={table.loading}
        fetching={table.fetching}
        error={table.error}
        pagination={table.pagination}
        onPaginationChange={table.setPagination}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        columnFilters={table.columnFilters}
        onColumnFiltersChange={table.setColumnFilters}
        emptyIcon={UserPlus}
        emptyTitle="暂无代理申请"
        emptyDescription="用户提交的代理申请将显示在这里"
      />

      {/* 通过对话框 */}
      <Dialog open={!!approveItem} onOpenChange={(open) => { if (!open) setApproveItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>通过代理申请</DialogTitle>
            <DialogDescription>
              通过「{approveItem?.username}」的代理申请，设定返佣比例与分组
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApprove} className="space-y-4" key={defaultRate}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approve-rate">首单返佣（%）</Label>
                <Input id="approve-rate" name="commission_rate" type="number" min={1} max={100} required defaultValue={defaultRate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approve-rate-recurring">后续返佣（%）</Label>
                <Input id="approve-rate-recurring" name="commission_rate_recurring" type="number" min={0} max={100} defaultValue={0} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>代理分组</Label>
              <Select value={approveGroup} onValueChange={setApproveGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>不绑定分组</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {approveItem?.remark && (
              <div className="text-sm text-muted-foreground rounded-md border p-3">
                <span className="font-medium">用户备注：</span>{approveItem.remark}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setApproveItem(null)}>取消</Button>
              <Button type="submit" disabled={approveSaving || settingsLoading}>
                {approveSaving ? "处理中..." : "通过"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 拒绝对话框 */}
      <Dialog open={!!rejectItem} onOpenChange={(open) => { if (!open) setRejectItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝代理申请</DialogTitle>
            <DialogDescription>
              拒绝「{rejectItem?.username}」的代理申请
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {rejectItem?.remark && (
              <div className="text-sm text-muted-foreground rounded-md border p-3">
                <span className="font-medium">用户备注：</span>{rejectItem.remark}
              </div>
            )}
            <div className="space-y-2">
              <Label>拒绝原因（选填）</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="填写拒绝原因..."
                maxLength={512}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectItem(null)}>取消</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectSaving}>
              {rejectSaving ? "处理中..." : "拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
