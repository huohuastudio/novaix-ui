import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getAdminVpcs,
  postAdminVpcs,
  deleteAdminVpcsById,
  getAdminVpcNodeGroups,
} from "@/api"
import type { VpcVpcItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

// ── Schema ──

const vpcSchema = z.object({
  user_id: z.coerce.number().int().min(1, "请输入用户 ID"),
  name: z.string().min(1, "请输入名称").max(64),
  node_group_id: z.coerce.number().int().min(1, "请选择节点组"),
  cidr: z.string().min(1, "请输入网段").max(64),
  description: z.string().max(512).default(""),
})

type VpcFormValues = z.infer<typeof vpcSchema>

const formDefaults: VpcFormValues = {
  user_id: 0,
  name: "",
  node_group_id: 0,
  cidr: "",
  description: "",
}

// ── 节点组分页加载 ──

// (节点组选项在 VpcCreateDialog 中加载)

// ── 状态 Badge ──

function StatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "active":
      return <Badge variant="default">正常</Badge>
    case "creating":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">创建中</Badge>
    case "error":
      return <Badge variant="destructive">异常</Badge>
    default:
      return <Badge variant="secondary">{status ?? "-"}</Badge>
  }
}

// ── 创建对话框 ──

function VpcCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const form = useForm<VpcFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(vpcSchema) as any,
    defaultValues: formDefaults,
  })

  const [nodeGroups, setNodeGroups] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    if (open) {
      form.reset(formDefaults)
      getAdminVpcNodeGroups().then(({ data: res }) => {
        setNodeGroups((res?.data as { id: number; name: string }[] | undefined) ?? [])
      })
    }
  }, [open, form])

  const onSubmit = async (values: VpcFormValues) => {
    try {
      const { data: res } = await postAdminVpcs({ body: values })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "创建失败")
        return
      }
      toast.success("VPC 已创建")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" preventClose>
        <DialogHeader>
          <DialogTitle>创建 VPC</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>用户 ID</FormLabel>
                  <FormControl><Input type="number" placeholder="1" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>名称</FormLabel>
                  <FormControl><Input placeholder="my-vpc" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="node_group_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>节点组</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="选择节点组" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {nodeGroups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cidr"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel required>网段 (CIDR)</FormLabel>
                    <HelpLink path="/novaix/vpc" />
                  </div>
                  <FormControl><Input placeholder="10.0.0.0/16" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="可选描述信息" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── 主页面 ──

export default function VPCs() {
  useBreadcrumb([{ label: "VPC 管理" }])
  const formatDate = useFormatDate()
  const adminPath = useAdminPath()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchVpcs = useCallback(async ({ page, pageSize }: FetchParams) => {
    const { data: res } = await getAdminVpcs({
      query: {
        page,
        page_size: pageSize,
      },
    })

    const data = res?.data as Record<string, unknown> | undefined
    return {
      items: (data?.items ?? []) as VpcVpcItem[],
      total: (data?.total as number) ?? 0,
      page: (data?.page as number) ?? 1,
      page_size: (data?.page_size as number) ?? pageSize,
    }
  }, [])

  const table = useDataTable<VpcVpcItem>({
    fetchFn: fetchVpcs,
    filterKeys: [],
  })

  const handleDelete = useCallback(async (item: VpcVpcItem) => {
    const ok = await confirm({
      title: "删除 VPC",
      description: `确定要删除 VPC「${item.name}」吗？删除前需先移除所有子网。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminVpcsById({ path: { id: item.id! } })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "删除失败")
        return
      }
      toast.success("VPC 已删除")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }, [confirm, table])

  const columns: ColumnDef<VpcVpcItem>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "名称",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="h-auto p-0 font-medium"
          onClick={() => navigate(`${adminPath}/vpcs/${row.original.id}`)}
        >
          {row.original.name}
        </Button>
      ),
    },
    {
      accessorKey: "cidr",
      header: "网段",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.cidr}</span>
      ),
    },
    {
      accessorKey: "node_group_name",
      header: "节点组",
      cell: ({ row }) => row.original.node_group_name ?? "-",
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "subnet_count",
      header: "子网数",
      cell: ({ row }) => row.original.subnet_count ?? 0,
    },
    {
      accessorKey: "instance_count",
      header: "实例数",
      cell: ({ row }) => row.original.instance_count ?? 0,
    },
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(item)
                  }}
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
  ], [handleDelete, formatDate, adminPath, navigate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">VPC 管理</h1>
          <HelpLink path="/novaix/vpc" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理私有网络，隔离实例间的网络通信</p>
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
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            创建 VPC
          </Button>
        }
      />

      <VpcCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={table.refresh}
      />

      {ConfirmDialog}
    </div>
  )
}
