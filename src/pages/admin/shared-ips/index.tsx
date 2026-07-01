import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import { PaginatedSelect, type PaginatedSelectItem } from "@/components/paginated-select"
import {
  getAdminSharedIps,
  postAdminSharedIps,
  putAdminSharedIpsById,
  deleteAdminSharedIpsById,
  getAdminNodes,
} from "@/api"
import type { ServiceSharedIpItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

// ── Schema ──

const sharedIpSchema = z.object({
  node_id: z.coerce.number().int().min(1, "请选择节点"),
  network_name: z.string().min(1, "请输入网络名称").max(64),
  address: z.string().min(1, "请输入 IP 地址"),
  port_start: z.coerce.number().int().min(1, "请输入起始端口"),
  port_end: z.coerce.number().int().min(1, "请输入结束端口"),
  description: z.string().max(512).default(""),
  status: z.coerce.number().int().default(1),
  mode: z.enum(["shared", "dedicated"]).default("shared"),
})

type SharedIpFormValues = z.infer<typeof sharedIpSchema>

const formDefaults: SharedIpFormValues = {
  node_id: 0,
  network_name: "",
  address: "",
  port_start: 10000,
  port_end: 60000,
  description: "",
  status: 1,
  mode: "shared",
}

// ── 节点分页加载 ──

const fetchNodeOptions = async (page: number, keyword: string) => {
  const { data: res } = await getAdminNodes({
    query: { page, page_size: 20, status: 1, ...(keyword ? { keyword } : {}) },
  })
  const nodes = res?.data?.items ?? []
  const total = res?.data?.total ?? 0
  return {
    items: nodes.map((n) => ({
      id: String(n.id),
      label: n.name ?? `节点 ${n.id}`,
    })),
    hasMore: page * 20 < total,
  }
}

// ── 共享表单字段 ──

function SharedIpFormFields({
  form,
  initialNodeItem,
}: {
  form: UseFormReturn<SharedIpFormValues>
  initialNodeItem?: PaginatedSelectItem
}) {
  const mode = form.watch("mode")
  return (
    <>
      <FormField
        control={form.control}
        name="mode"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1.5">
              <FormLabel required>模式</FormLabel>
              <HelpLink path="/novaix/shared-ip" />
            </div>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="shared">共享（多实例共享端口段）</SelectItem>
                <SelectItem value="dedicated">独享（单实例全端口 + 独立出口）</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="node_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>节点</FormLabel>
            <FormControl>
              <PaginatedSelect
                value={field.value ? String(field.value) : ""}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                fetchFn={fetchNodeOptions}
                initialItem={initialNodeItem}
                placeholder="选择节点"
                searchPlaceholder="搜索节点..."
                emptyText="无匹配节点"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="network_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>网络名称</FormLabel>
              <FormControl><Input placeholder="br0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>IP 地址</FormLabel>
              <FormControl><Input placeholder="203.0.113.10" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {mode === "shared" && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="port_start"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>起始端口</FormLabel>
                <FormControl><Input type="number" placeholder="10000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="port_end"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>结束端口</FormLabel>
                <FormControl><Input type="number" placeholder="60000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

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

      <div className="flex items-center gap-3 py-2">
        <Switch
          checked={form.watch("status") === 1}
          onCheckedChange={(v) => form.setValue("status", v ? 1 : 0)}
        />
        <Label>启用</Label>
      </div>
    </>
  )
}

// ── 创建对话框 ──

function SharedIpCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const form = useForm<SharedIpFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(sharedIpSchema) as any,
    defaultValues: formDefaults,
  })

  useEffect(() => {
    if (open) form.reset(formDefaults)
  }, [open, form])

  const onSubmit = async (values: SharedIpFormValues) => {
    try {
      const { data: res } = await postAdminSharedIps({ body: values })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "创建失败")
        return
      }
      toast.success("共享 IP 已创建")
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
          <DialogTitle>创建共享 IP</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <SharedIpFormFields form={form} />
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

// ── 编辑对话框 ──

function SharedIpEditDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ServiceSharedIpItem
  onSuccess: () => void
}) {
  const form = useForm<SharedIpFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(sharedIpSchema) as any,
    defaultValues: formDefaults,
  })

  useEffect(() => {
    if (open) {
      form.reset({
        node_id: item.node_id ?? 0,
        network_name: item.network_name ?? "",
        address: item.address ?? "",
        port_start: item.port_start ?? 10000,
        port_end: item.port_end ?? 60000,
        description: item.description ?? "",
        status: item.status ?? 1,
        mode: (item as Record<string, unknown>).mode as "shared" | "dedicated" ?? "shared",
      })
    }
  }, [open, item, form])

  const onSubmit = async (values: SharedIpFormValues) => {
    try {
      const { data: res } = await putAdminSharedIpsById({
        path: { id: item.id! },
        body: values,
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "更新失败")
        return
      }
      toast.success("共享 IP 已更新")
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
          <DialogTitle>编辑共享 IP</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <SharedIpFormFields
              form={form}
              initialNodeItem={
                item.node_id
                  ? { id: String(item.node_id), label: item.node_name ?? `节点 ${item.node_id}` }
                  : undefined
              }
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── 主页面 ──

export default function SharedIPs() {
  useBreadcrumb([{ label: "共享 IP 管理" }])
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ServiceSharedIpItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchSharedIps = useCallback(async ({ page, pageSize }: FetchParams) => {
    const { data: res } = await getAdminSharedIps({
      query: {
        page,
        page_size: pageSize,
      },
    })

    const data = res?.data as Record<string, unknown> | undefined
    return {
      items: (data?.items ?? []) as ServiceSharedIpItem[],
      total: (data?.total as number) ?? 0,
      page: (data?.page as number) ?? 1,
      page_size: (data?.page_size as number) ?? pageSize,
    }
  }, [])

  const table = useDataTable<ServiceSharedIpItem>({
    fetchFn: fetchSharedIps,
    filterKeys: [],
  })

  const handleDelete = useCallback(async (item: ServiceSharedIpItem) => {
    const ok = await confirm({
      title: "删除共享 IP",
      description: `确定要删除共享 IP「${item.address}」吗？已分配的端口映射将失效。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminSharedIpsById({ path: { id: item.id! } })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "删除失败")
        return
      }
      toast.success("共享 IP 已删除")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }, [confirm, table])

  const columns: ColumnDef<ServiceSharedIpItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "node_name",
      header: "节点",
      cell: ({ row }) => row.original.node_name ?? "-",
    },
    {
      accessorKey: "address",
      header: "IP 地址",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.address}</span>
      ),
    },
    {
      id: "mode",
      header: "模式",
      cell: ({ row }) => {
        const mode = (row.original as Record<string, unknown>).mode as string
        return (
          <Badge variant={mode === "dedicated" ? "outline" : "secondary"}>
            {mode === "dedicated" ? "独享" : "共享"}
          </Badge>
        )
      },
    },
    {
      id: "port_range",
      header: "端口范围",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.port_start} - {row.original.port_end}
        </span>
      ),
    },
    {
      id: "usage",
      header: "已分配/容量",
      cell: ({ row }) => {
        const allocated = row.original.allocated_count ?? 0
        const capacity = row.original.total_capacity ?? 0
        return (
          <div className="text-sm">
            <span className="text-primary font-medium">{allocated}</span>
            <span className="text-muted-foreground"> / {capacity}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <Badge variant={row.original.status === 1 ? "default" : "secondary"}>
          {row.original.status === 1 ? "启用" : "禁用"}
        </Badge>
      ),
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
                  className="size-8"
                  onClick={() => setEditingItem(item)}
                >
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
                  onClick={() => handleDelete(item)}
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
  ], [handleDelete, formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">共享 IP 管理</h1>
          <HelpLink path="/novaix/shared-ip" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理 NAT 模式下的共享公网 IP 及端口范围</p>
      </div>

      <DataTable
        tourId="shared-ip-table"
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
            创建共享 IP
          </Button>
        }
      />

      <SharedIpCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={table.refresh}
      />

      {editingItem && (
        <SharedIpEditDialog
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null) }}
          item={editingItem}
          onSuccess={table.refresh}
        />
      )}

      {ConfirmDialog}
    </div>
  )
}
