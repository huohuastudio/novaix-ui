import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import { Plus, Pencil, Trash2, Rocket, MoreHorizontal, Wrench, ArrowRightFromLine, RotateCcw, Server, Plug } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  getAdminNodes,
  deleteAdminNodesById,
  postAdminNodesByIdInit,
  postAdminNodesByIdMaintenance,
  postAdminNodesByIdRestore,
  postAdminNodesByIdEvacuate,
  postAdminNodesByIdTestConnection,
} from "@/api"
import type { NodeNodeItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useTasks } from "@/hooks/use-tasks"
import { NODE_STATUS, statusMap, statusFilterOptions } from "@/lib/node-constants"
import NodeFormSheet from "./node-form-sheet"
import { EmptyState } from "@/components/empty-state"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import NodeGroups from "./node-groups"
import { getErrorMessage } from "@/lib/utils"

function NodeList() {
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<NodeNodeItem | undefined>()
  const { confirm, ConfirmDialog } = useConfirm()
  const { addTask } = useTasks()

  const fetchNodes = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "name" | "region" | "status" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminNodes({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        region: (filters.region as string) || undefined,
        status: filters.status !== undefined ? Number(filters.status) as 0 | 1 | 2 | 3 | 4 : undefined,
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
    fetchFn: fetchNodes,
    filterKeys: ["name", "status"],
  })

  const handleCreate = () => {
    setEditingNode(undefined)
    setSheetOpen(true)
  }

  const handleEdit = useCallback((node: NodeNodeItem) => {
    setEditingNode(node)
    setSheetOpen(true)
  }, [])

  const handleInit = useCallback(async (node: NodeNodeItem) => {
    const ok = await confirm({
      title: "初始化节点",
      description: (
        <>
          <p>确定要初始化节点「{node.name}」吗？系统将通过 SSH 连接宿主机并自动执行以下操作：</p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
            <li>检测操作系统类型和版本</li>
            <li>安装运行环境及虚拟机支持组件（QEMU/KVM）</li>
            <li>初始化运行环境并配置远程 API</li>
            <li>生成 TLS 客户端证书用于安全通信</li>
            <li>配置安全策略（AppArmor，如适用）</li>
          </ul>
          <p className="mt-2">初始化期间节点将暂时不可用，整个过程可能需要几分钟。</p>
        </>
      ),
      confirmText: "开始初始化",
    })
    if (!ok) return
    const { data: res } = await postAdminNodesByIdInit({ path: { id: node.id! } })
    const taskId = res?.data?.init_task_id
    if (taskId) addTask(taskId, "init_node")
    table.refresh()
  }, [table, confirm, addTask])

  const handleTestConnection = useCallback(async (node: NodeNodeItem) => {
    toast.info(`正在测试节点「${node.name}」的连接...`)
    try {
      const { data: res } = await postAdminNodesByIdTestConnection({ path: { id: node.id! } })
      if (res?.code === 0 && res.data) {
        const ssh = res.data.ssh
        const incus = res.data.incus
        if (ssh?.success && (!incus || incus.success)) {
          toast.success(`节点「${node.name}」连接正常（SSH: ${ssh.latency}ms${incus ? `，服务端: ${incus.latency}ms` : ""}）`)
        } else {
          const parts: string[] = []
          if (ssh && !ssh.success) parts.push(`SSH: ${ssh.message}`)
          if (incus && !incus.success) parts.push(`服务端: ${incus.message}`)
          toast.error(parts.join("；") || "连接测试失败")
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "测试连接失败"))
    }
  }, [])

  const handleDelete = useCallback(async (node: NodeNodeItem) => {
    const ok = await confirm({
      title: "删除节点",
      description: `确定要删除节点「${node.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    await deleteAdminNodesById({ path: { id: node.id! } })
    table.refresh()
  }, [table, confirm])

  const handleMaintenance = useCallback(async (node: NodeNodeItem) => {
    const ok = await confirm({
      title: "进入维护模式",
      description: `确定要将节点「${node.name}」设为维护模式吗？维护期间不会在该节点上创建新实例。若节点组启用了高可用，将自动疏散实例到其他节点。`,
      confirmText: "进入维护",
    })
    if (!ok) return
    try {
      const { data: res } = await postAdminNodesByIdMaintenance({ path: { id: node.id! } })
      const taskId = res?.data?.task_id
      if (taskId) {
        addTask(taskId, "evacuate_node")
        toast.success("已进入维护模式，正在疏散实例")
      } else {
        toast.success("已进入维护模式")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    }
    table.refresh()
  }, [table, confirm, addTask])

  const handleRestore = useCallback(async (node: NodeNodeItem) => {
    const ok = await confirm({
      title: "退出维护模式",
      description: `确定要将节点「${node.name}」恢复为在线状态吗？`,
      confirmText: "恢复在线",
    })
    if (!ok) return
    try {
      await postAdminNodesByIdRestore({ path: { id: node.id! } })
      toast.success("节点已恢复在线")
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    }
    table.refresh()
  }, [table, confirm])

  const handleEvacuate = useCallback(async (node: NodeNodeItem) => {
    const ok = await confirm({
      title: "手动疏散",
      description: `确定要疏散节点「${node.name}」上的全部实例吗？实例将被迁移到同组其他在线节点。`,
      confirmText: "开始疏散",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await postAdminNodesByIdEvacuate({ path: { id: node.id! } })
      const taskId = res?.data?.task_id
      if (taskId) {
        addTask(taskId, "evacuate_node")
        toast.success("疏散任务已提交")
      } else {
        toast.info("节点上没有需要疏散的实例")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "操作失败"))
    }
    table.refresh()
  }, [table, confirm, addTask])

  const handleFormSuccess = () => {
    setSheetOpen(false)
    table.refresh()
  }

  const columns: ColumnDef<NodeNodeItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "名称",
      enableSorting: true,
      meta: {
        filterVariant: "text",
        filterPlaceholder: "搜索名称/地址...",
      },
      cell: ({ row }) => (
        <Link to={`${adminPath}/nodes/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "region",
      header: "区域",
      enableSorting: true,
    },
    {
      accessorKey: "host",
      header: "主机地址",
      cell: ({ row }) => {
        const node = row.original
        return `${node.host}:${node.port}`
      },
    },
    {
      accessorKey: "arch",
      header: "架构",
      cell: ({ row }) => {
        const arch = row.original.arch
        return arch || <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      enableSorting: true,
      meta: {
        filterVariant: "select",
        filterPlaceholder: "状态",
        filterOptions: statusFilterOptions,
      },
      cell: ({ row }) => {
        const node = row.original
        const status = node.status ?? 0
        const info = statusMap[status] ?? { label: "未知", variant: "outline" as const }

        if (status === NODE_STATUS.DEPLOYING) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={info.variant} className="gap-1">
                  <Spinner size="sm" />
                  {info.label}
                </Badge>
              </TooltipTrigger>
              {node.status_message && (
                <TooltipContent>{node.status_message}</TooltipContent>
              )}
            </Tooltip>
          )
        }

        if ((status === NODE_STATUS.ERROR || status === NODE_STATUS.UNREACHABLE) && node.status_message) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={info.variant}>{info.label}</Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{node.status_message}</TooltipContent>
            </Tooltip>
          )
        }

        return <Badge variant={info.variant}>{info.label}</Badge>
      },
    },
    {
      id: "resources",
      header: "资源",
      cell: ({ row }) => {
        const node = row.original
        if (!node.cpu_total) return <span className="text-muted-foreground">-</span>
        const mem = node.mem_total && node.mem_total >= 1024
          ? `${(node.mem_total / 1024).toFixed(node.mem_total % 1024 === 0 ? 0 : 1)}G`
          : `${node.mem_total}M`
        const disk = node.disk_total && node.disk_total >= 1024
          ? `${(node.disk_total / 1024).toFixed(1)}T`
          : `${node.disk_total}G`
        return (
          <span className="text-xs text-muted-foreground">
            {node.cpu_total}C / {mem} / {disk}
          </span>
        )
      },
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
      cell: ({ row }) => {
        const node = row.original
        const isDeploying = node.status === NODE_STATUS.DEPLOYING
        const isOnline = node.status === NODE_STATUS.ONLINE
        const isMaintenance = node.status === NODE_STATUS.MAINTENANCE
        const hasGroup = !!node.node_group_id
        return (
          <div className="flex items-center gap-1" data-tour="node-actions">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" disabled={isDeploying} onClick={() => handleInit(node)}>
                  {isDeploying ? <Spinner /> : <Rocket className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDeploying ? "正在初始化..." : "初始化"}</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(node)}>
              <Pencil className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleTestConnection(node)}>
                  <Plug className="size-4 mr-2" />
                  测试连接
                </DropdownMenuItem>
                {isOnline && (
                  <DropdownMenuItem onClick={() => handleMaintenance(node)}>
                    <Wrench className="size-4 mr-2" />
                    维护模式
                  </DropdownMenuItem>
                )}
                {isMaintenance && (
                  <DropdownMenuItem onClick={() => handleRestore(node)}>
                    <RotateCcw className="size-4 mr-2" />
                    退出维护
                  </DropdownMenuItem>
                )}
                {hasGroup && (
                  <DropdownMenuItem onClick={() => handleEvacuate(node)}>
                    <ArrowRightFromLine className="size-4 mr-2" />
                    手动疏散
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(node)}>
                  <Trash2 className="size-4 mr-2" />
                  删除节点
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [handleEdit, handleDelete, handleInit, handleTestConnection, handleMaintenance, handleRestore, handleEvacuate, formatDate, adminPath])

  return (
    <>
      <DataTable
        tourId="node-table"
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
          <Button onClick={handleCreate} data-tour="node-add-btn">
            <Plus className="size-4" />
            添加节点
          </Button>
        }
        emptyState={
          <EmptyState
            icon={Server}
            title="暂无节点"
            description="添加第一个计算节点来开始使用系统"
            action={{ label: "添加节点", onClick: handleCreate }}
          />
        }
      />
      <NodeFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        node={editingNode}
        onSuccess={handleFormSuccess}
      />
      {ConfirmDialog}
    </>
  )
}

export default function Nodes() {
  useBreadcrumb([{ label: "节点管理" }])
  const [tab, setTab] = useState("nodes")

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0 flex items-start justify-between">
        <div data-tour="node-description">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">节点管理</h1>
            <HelpLink path="/novaix/node" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">节点即运行实例的物理服务器。添加后需执行初始化，然后将节点加入节点组，再由套餐关联节点组进行售卖</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-tour="node-tabs">
            <TabsTrigger value="nodes">节点列表</TabsTrigger>
            <TabsTrigger value="groups">节点组</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "nodes" ? <NodeList /> : <NodeGroups />}
    </div>
  )
}
