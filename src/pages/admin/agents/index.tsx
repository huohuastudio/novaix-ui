import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  getAdminAgents,
  postAdminAgents,
  deleteAdminAgentsById,
  putAdminAgentsById,
  getAdminAgentGroups,
} from "@/api"
import type { AgentAgentItem, AgentGroupItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useFormatDate, useFormatAmount } from "@/hooks/use-site-settings"
import { getErrorMessage } from "@/lib/utils"
import { UserPopover } from "@/components/user-popover"
import AgentGroups from "./agent-groups"

const NO_GROUP = "none"

function AgentList() {
  const formatDate = useFormatDate()
  const formatAmount = useFormatAmount()
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createGroup, setCreateGroup] = useState(NO_GROUP)
  const [editingItem, setEditingItem] = useState<AgentAgentItem | null>(null)
  const [editGroup, setEditGroup] = useState(NO_GROUP)
  const [editSaving, setEditSaving] = useState(false)
  const [groups, setGroups] = useState<AgentGroupItem[]>([])
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    getAdminAgentGroups().then(({ data: res }) => {
      if (res?.code === 0) setGroups(res.data ?? [])
    }).catch(() => { /* 分组加载失败不阻塞代理列表 */ })
  }, [])

  const groupName = useCallback((id?: number) => {
    if (!id) return null
    return groups.find((g) => g.id === id)?.name ?? `分组 ${id}`
  }, [groups])

  const fetchData = useCallback(async ({ page, pageSize, filters }: FetchParams) => {
    const { data: res } = await getAdminAgents({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.username as string) || undefined,
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
    filterKeys: ["username"],
  })

  const handleCreate = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setCreating(true)
    try {
      const { data: res } = await postAdminAgents({
        body: {
          user_id: Number(form.get("user_id")),
          commission_rate: Number(form.get("commission_rate")),
          commission_rate_recurring: Number(form.get("commission_rate_recurring")),
          // 0 表示不绑定分组（后端归一化为 NULL）
          agent_group_id: createGroup === NO_GROUP ? 0 : Number(createGroup),
        },
      })
      if (res?.code === 0) {
        toast.success("设置代理成功")
        setCreateOpen(false)
        table.refresh()
      } else {
        toast.error(res?.message ?? "设置失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "设置失败"))
    } finally {
      setCreating(false)
    }
  }, [table, createGroup])

  const handleUpdateRate = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingItem) return
    const form = new FormData(e.currentTarget)
    setEditSaving(true)
    try {
      const { data: res } = await putAdminAgentsById({
        path: { id: editingItem.id! },
        body: {
          commission_rate: Number(form.get("commission_rate")),
          commission_rate_recurring: Number(form.get("commission_rate_recurring")),
          // 0 表示清除分组（后端：nil=不变，0=清除，>0=设置）
          agent_group_id: editGroup === NO_GROUP ? 0 : Number(editGroup),
        },
      })
      if (res?.code === 0) {
        toast.success("更新成功")
        setEditingItem(null)
        table.refresh()
      } else {
        toast.error(res?.message ?? "更新失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "更新失败"))
    } finally {
      setEditSaving(false)
    }
  }, [editingItem, table, editGroup])

  const openCreate = () => {
    setCreateGroup(NO_GROUP)
    setCreateOpen(true)
  }

  const openEdit = (item: AgentAgentItem) => {
    setEditGroup(item.agent_group_id ? String(item.agent_group_id) : NO_GROUP)
    setEditingItem(item)
  }

  const handleDelete = useCallback(async (item: AgentAgentItem) => {
    const ok = await confirm({
      title: "取消代理",
      description: `确定要取消「${item.username}」的代理身份吗？该用户将变为普通用户。`,
      confirmText: "取消代理",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminAgentsById({ path: { id: item.id! } })
      if (res?.code === 0) {
        toast.success("已取消代理")
        table.refresh()
      } else {
        toast.error(res?.message ?? "操作失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    }
  }, [table, confirm])

  const columns: ColumnDef<AgentAgentItem>[] = useMemo(() => [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "username",
      header: "用户名",
      meta: { filterVariant: "text", filterPlaceholder: "搜索用户名/邮箱..." },
      cell: ({ row }) => (
        <UserPopover userId={row.original.id} username={row.original.username} />
      ),
    },
    { accessorKey: "email", header: "邮箱" },
    {
      accessorKey: "agent_group_id",
      header: "分组",
      cell: ({ row }) => {
        const name = groupName(row.original.agent_group_id)
        return name ? <Badge variant="secondary">{name}</Badge> : <span className="text-muted-foreground">无</span>
      },
    },
    {
      accessorKey: "commission_rate",
      header: "首单返佣",
      cell: ({ row }) => `${row.original.commission_rate ?? 0}%`,
    },
    {
      accessorKey: "commission_rate_recurring",
      header: "后续返佣",
      cell: ({ row }) => {
        const r = row.original.commission_rate_recurring ?? 0
        return r > 0 ? `${r}%` : <span className="text-muted-foreground">已关闭</span>
      },
    },
    {
      accessorKey: "total_commission",
      header: "累计返佣",
      cell: ({ row }) => formatAmount(row.original.total_commission ?? 0),
    },
    { accessorKey: "sub_user_count", header: "下级用户数" },
    {
      accessorKey: "created_at",
      header: "创建时间",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(item)}>
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑代理</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>取消代理</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ], [handleDelete, formatDate, formatAmount, groupName])

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
        toolbar={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            设置代理
          </Button>
        }
      />

      {/* 设置代理对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置代理</DialogTitle>
            <DialogDescription>将指定用户设置为代理并设定返佣与分组</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-user-id">用户 ID</Label>
              <Input id="agent-user-id" name="user_id" type="number" min={1} required placeholder="输入用户 ID" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent-rate">首单返佣（%）</Label>
                <Input id="agent-rate" name="commission_rate" type="number" min={1} max={100} required defaultValue={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-rate-recurring">后续返佣（%）</Label>
                <Input id="agent-rate-recurring" name="commission_rate_recurring" type="number" min={0} max={100} defaultValue={5} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>代理分组</Label>
              <Select value={createGroup} onValueChange={setCreateGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>不绑定分组</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">绑定分组后，返佣比例与分销折扣以分组（及套餐费率矩阵）为准</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" disabled={creating}>
                {creating ? "设置中..." : "设置"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 编辑代理对话框 */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑代理</DialogTitle>
            <DialogDescription>修改「{editingItem?.username}」的返佣比例与分组</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateRate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rate">首单返佣（%）</Label>
                <Input id="edit-rate" name="commission_rate" type="number" min={1} max={100} required defaultValue={editingItem?.commission_rate ?? 20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rate-recurring">后续返佣（%）</Label>
                <Input id="edit-rate-recurring" name="commission_rate_recurring" type="number" min={0} max={100} defaultValue={editingItem?.commission_rate_recurring ?? 0} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>代理分组</Label>
              <Select value={editGroup} onValueChange={setEditGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>不绑定分组</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>取消</Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  )
}

export default function Agents() {
  useBreadcrumb([{ label: "代理管理" }])
  const [tab, setTab] = useState("agents")

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">代理管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理代理用户、返佣设置与代理分组</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="agents">代理列表</TabsTrigger>
            <TabsTrigger value="groups">代理分组</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "agents" ? <AgentList /> : <AgentGroups />}
    </div>
  )
}
