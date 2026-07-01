import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, Wallet, ArrowUpDown, LogIn } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAdminUsers, deleteAdminUsersById, postAdminUsersByIdLoginAs } from "@/api"
import type { UserUserItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { getUser } from "@/lib/auth"
import { UserCreateDialog, UserEditDialog } from "./user-form-sheet"
import { RechargeDialog, AdjustBalanceDialog } from "./balance-dialog"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useFormatAmount, useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { ExportButton } from "@/components/export-button"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { roleMap } from "@/lib/user-constants"

export default function Users() {
  useBreadcrumb([{ label: "用户管理" }])
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserUserItem | null>(null)
  const [rechargeUser, setRechargeUser] = useState<UserUserItem | null>(null)
  const [adjustUser, setAdjustUser] = useState<UserUserItem | null>(null)
  const currentUser = useMemo(() => getUser(), [])
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchUsers = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "username" | "email" | "balance" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminUsers({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.username as string) || undefined,
        role: filters.role as "admin" | "agent" | "user" | undefined,
        status: filters.status !== undefined ? Number(filters.status) as 0 | 1 : undefined,
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
    fetchFn: fetchUsers,
    filterKeys: ["username", "role", "status"],
  })

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleEdit = useCallback((user: UserUserItem) => {
    setEditingUser(user)
  }, [])

  const handleDelete = useCallback(async (user: UserUserItem) => {
    const ok = await confirm({
      title: "删除用户",
      description: `确定要删除用户「${user.username}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminUsersById({ path: { id: user.id! } })
    table.refresh()
  }, [table, confirm])

  const handleRecharge = useCallback((user: UserUserItem) => {
    setRechargeUser(user)
  }, [])

  const handleAdjust = useCallback((user: UserUserItem) => {
    setAdjustUser(user)
  }, [])

  const handleLoginAs = useCallback(async (user: UserUserItem) => {
    try {
      const { data: res } = await postAdminUsersByIdLoginAs({ path: { id: user.id! } })
      if (res?.code === 0 && res.data?.ticket) {
        window.open(`/portal/impersonate?ticket=${res.data.ticket}`, '_blank')
      } else {
        toast.error(res?.message || '获取登录凭证失败')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, '获取登录凭证失败'))
    }
  }, [])

  const handleFormSuccess = () => {
    setCreateOpen(false)
    setEditingUser(null)
    table.refresh()
  }

  const handleBalanceSuccess = () => {
    setRechargeUser(null)
    setAdjustUser(null)
    table.refresh()
  }

  const columns: ColumnDef<UserUserItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "username",
      header: "用户名",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索用户名/邮箱...",
      },
      cell: ({ row }) => (
        <Link
          to={`${adminPath}/users/${row.original.id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.original.username}
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: "邮箱",
      enableSorting: true,
      cell: ({ row }) => row.original.email || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "phone",
      header: "手机号",
      enableSorting: false,
      cell: ({ row }) => row.original.phone || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "role",
      header: "角色",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "角色",
        filterOptions: [
          { label: "管理员", value: "admin" },
          { label: "代理商", value: "agent" },
          { label: "用户", value: "user" },
        ],
      },
      cell: ({ row }) => {
        const role = roleMap[row.getValue("role") as string]
        return <Badge variant={role?.variant ?? "outline"}>{role?.label ?? row.getValue("role")}</Badge>
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: false,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: [
          { label: "正常", value: "1" },
          { label: "禁用", value: "0" },
        ],
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as number
        return (
          <Badge variant={status === 1 ? "default" : "secondary"}>
            {status === 1 ? "正常" : "禁用"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "balance",
      header: "余额",
      enableSorting: true,
      cell: ({ row }) => {
        const balance = row.getValue("balance") as number
        return formatAmount(balance)
      },
    },
    {
      accessorKey: "kyc_status",
      header: "实名",
      enableSorting: false,
      cell: ({ row }) => {
        const kyc = row.original.kyc_status
        if (kyc === "verified") {
          return <Badge variant="default" className="bg-emerald-600">已认证</Badge>
        }
        return <Badge variant="outline" className="text-muted-foreground">未认证</Badge>
      },
    },
    {
      accessorKey: "created_at",
      header: "注册时间",
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const user = row.original
        const isSelf = user.id === currentUser?.id
        const canLoginAs = !isSelf && user.role !== 'admin' && user.status === 1
        return (
          <div className="flex items-center gap-1">
            {canLoginAs && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => handleLoginAs(user)}>
                    <LogIn className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>登录</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleRecharge(user)}>
                  <Wallet className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>充值</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleAdjust(user)}>
                  <ArrowUpDown className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>调账</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(user)}>
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  disabled={isSelf}
                  onClick={() => handleDelete(user)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ], [currentUser, handleEdit, handleDelete, handleRecharge, handleAdjust, handleLoginAs, formatAmount, formatDate, adminPath])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
          <HelpLink path="/novaix/user" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理系统中的所有用户账号</p>
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
        toolbar={
          <div className="flex gap-2">
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              添加用户
            </Button>
            <ExportButton endpoint="users" disabled={table.data.total === 0} />
          </div>
        }
      />
      <UserCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleFormSuccess}
      />
      {editingUser && (
        <UserEditDialog
          open={!!editingUser}
          onOpenChange={(open) => { if (!open) setEditingUser(null) }}
          user={editingUser}
          onSuccess={handleFormSuccess}
        />
      )}
      <RechargeDialog
        open={!!rechargeUser}
        onOpenChange={(open) => { if (!open) setRechargeUser(null) }}
        user={rechargeUser}
        onSuccess={handleBalanceSuccess}
      />
      <AdjustBalanceDialog
        open={!!adjustUser}
        onOpenChange={(open) => { if (!open) setAdjustUser(null) }}
        user={adjustUser}
        onSuccess={handleBalanceSuccess}
      />
      {ConfirmDialog}
    </div>
  )
}
