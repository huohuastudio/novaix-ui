import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Pencil, Trash2, Zap } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  getAdminIpPools,
  postAdminIpPools,
  putAdminIpPoolsById,
  deleteAdminIpPoolsById,
  postAdminIpPoolsByIdGenerate,
} from "@/api"
import type { IppoolIpPoolItem } from "@/api"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useConfirm } from "@/hooks/use-confirm"
import { useFormatDate } from "@/hooks/use-site-settings"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

// ── Schema ──

const poolSchema = z.object({
  name: z.string().min(1, "请输入名称").max(128),
  description: z.string().max(512).default(""),
  type: z.enum(["ipv4", "ipv6"]),
  gateway: z.string().min(1, "请输入网关"),
  cidr: z.string().min(1, "请输入 CIDR"),
  dns1: z.string().default("8.8.8.8"),
  dns2: z.string().default("8.8.4.4"),
  vlan: z.coerce.number().int().min(0).default(0),
  network_name: z.string().default(""),
})

type PoolFormValues = z.infer<typeof poolSchema>

const poolDefaults: PoolFormValues = {
  name: "",
  description: "",
  type: "ipv4",
  gateway: "",
  cidr: "",
  dns1: "8.8.8.8",
  dns2: "8.8.4.4",
  vlan: 0,
  network_name: "",
}

const generateSchema = z.object({
  start_ip: z.string().min(1, "请输入起始 IP"),
  end_ip: z.string().min(1, "请输入结束 IP"),
})

type GenerateFormValues = z.infer<typeof generateSchema>

// ── Shared form fields ──

function PoolFormFields({ form, typeDisabled }: { form: UseFormReturn<PoolFormValues>; typeDisabled?: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>名称</FormLabel>
              <FormControl><Input placeholder="公网 IPv4" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>类型</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={typeDisabled}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ipv4">IPv4</SelectItem>
                  <SelectItem value="ipv6">IPv6</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>描述</FormLabel>
            <FormControl><Input placeholder="如：香港BGP线路（可选）" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cidr"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>CIDR</FormLabel>
              <FormControl><Input placeholder="192.168.1.0/24" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gateway"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>网关</FormLabel>
              <FormControl><Input placeholder="192.168.1.1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="dns1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS 1</FormLabel>
              <FormControl><Input placeholder="8.8.8.8" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dns2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS 2</FormLabel>
              <FormControl><Input placeholder="8.8.4.4" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="vlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VLAN ID</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="network_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>网桥名称</FormLabel>
              <FormControl><Input placeholder="br0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}

// ── Pool Create Dialog ──

function PoolCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const form = useForm<PoolFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(poolSchema) as any,
    defaultValues: poolDefaults,
  })

  useEffect(() => {
    if (open) form.reset(poolDefaults)
  }, [open, form])

  const onSubmit = async (values: PoolFormValues) => {
    try {
      const { data: res } = await postAdminIpPools({ body: values })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "创建失败")
        return
      }
      toast.success("IP 池已创建")
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
          <DialogTitle>创建 IP 池</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PoolFormFields form={form} />
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

// ── Pool Edit Dialog ──

function PoolEditDialog({
  open,
  onOpenChange,
  pool,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pool: IppoolIpPoolItem
  onSuccess: () => void
}) {
  const form = useForm<PoolFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(poolSchema) as any,
    defaultValues: poolDefaults,
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: pool.name ?? "",
        description: pool.description ?? "",
        type: (pool.type as "ipv4" | "ipv6") ?? "ipv4",
        gateway: pool.gateway ?? "",
        cidr: pool.cidr ?? "",
        dns1: pool.dns1 ?? "8.8.8.8",
        dns2: pool.dns2 ?? "8.8.4.4",
        vlan: pool.vlan ?? 0,
        network_name: pool.network_name ?? "",
      })
    }
  }, [open, pool, form])

  const onSubmit = async (values: PoolFormValues) => {
    try {
      const { data: res } = await putAdminIpPoolsById({
        path: { id: pool.id! },
        body: values,
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "更新失败")
        return
      }
      toast.success("IP 池已更新")
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
          <DialogTitle>编辑 IP 池</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PoolFormFields form={form} typeDisabled />
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

// ── Generate IPs Dialog ──

function GenerateIPsDialog({
  open,
  onOpenChange,
  poolId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  poolId: number
  onSuccess: () => void
}) {
  const form = useForm<GenerateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(generateSchema) as any,
    defaultValues: { start_ip: "", end_ip: "" },
  })

  useEffect(() => {
    if (open) form.reset({ start_ip: "", end_ip: "" })
  }, [open, form])

  const onSubmit = async (values: GenerateFormValues) => {
    try {
      const { data: res } = await postAdminIpPoolsByIdGenerate({
        path: { id: poolId },
        body: values,
      })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "生成失败")
        return
      }
      const created = (res.data as Record<string, unknown>)?.created as number ?? 0
      toast.success(`成功生成 ${created} 个 IP`)
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" preventClose>
        <DialogHeader>
          <DialogTitle>批量生成 IP</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="start_ip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>起始 IP</FormLabel>
                  <FormControl><Input placeholder="192.168.1.10" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_ip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>结束 IP</FormLabel>
                  <FormControl><Input placeholder="192.168.1.100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "生成中..." : "生成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ──

export default function IPs() {
  useBreadcrumb([{ label: "IP 池管理" }])
  const formatDate = useFormatDate()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingPool, setEditingPool] = useState<IppoolIpPoolItem | null>(null)
  const [generatePool, setGeneratePool] = useState<IppoolIpPoolItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchPools = useCallback(async ({ page, pageSize, sorting, filters }: FetchParams) => {
    const sort = sorting[0]?.id as "id" | "name" | "type" | "created_at" | undefined
    const order: "asc" | "desc" | undefined = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

    const { data: res } = await getAdminIpPools({
      query: {
        page,
        page_size: pageSize,
        keyword: (filters.name as string) || undefined,
        sort,
        order,
      },
    })

    const data = res?.data as Record<string, unknown> | undefined
    return {
      items: (data?.items ?? []) as IppoolIpPoolItem[],
      total: (data?.total as number) ?? 0,
      page: (data?.page as number) ?? 1,
      page_size: (data?.page_size as number) ?? pageSize,
    }
  }, [])

  const table = useDataTable<IppoolIpPoolItem>({
    fetchFn: fetchPools,
    filterKeys: ["name"],
  })

  const handleEdit = useCallback((pool: IppoolIpPoolItem) => {
    setEditingPool(pool)
  }, [])

  const handleDelete = useCallback(async (pool: IppoolIpPoolItem) => {
    const ok = await confirm({
      title: "删除 IP 池",
      description: `确定要删除 IP 池「${pool.name}」吗？池中所有空闲 IP 将一并删除。如果有已分配的 IP，则无法删除。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminIpPoolsById({ path: { id: pool.id! } })
      if (res?.code !== 0) {
        toast.error(res?.message ?? "删除失败")
        return
      }
      toast.success("IP 池已删除")
      table.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, "请求失败"))
    }
  }, [confirm, table])

  const columns: ColumnDef<IppoolIpPoolItem>[] = useMemo(() => [
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
        filterVariant: "text" as const,
        filterPlaceholder: "搜索名称/CIDR...",
      },
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      enableSorting: true,
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.type?.toUpperCase()}</Badge>
      ),
    },
    {
      accessorKey: "cidr",
      header: "CIDR",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.cidr}</span>
      ),
    },
    {
      accessorKey: "gateway",
      header: "网关",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.gateway}</span>
      ),
    },
    {
      id: "usage",
      header: "IP 使用",
      cell: ({ row }) => {
        const pool = row.original
        const total = pool.total_ips ?? 0
        const used = pool.used_ips ?? 0
        const free = pool.free_ips ?? 0
        return (
          <div className="text-sm">
            <span className="text-primary font-medium">{used}</span>
            <span className="text-muted-foreground"> / {total}</span>
            <span className="text-muted-foreground text-xs ml-1">
              ({free} 空闲)
            </span>
          </div>
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
        const pool = row.original
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setGeneratePool(pool)}
                >
                  <Zap className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>批量生成 IP</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => handleEdit(pool)}
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
                  onClick={() => handleDelete(pool)}
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
  ], [handleEdit, handleDelete, formatDate])

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">IP 池管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理 IPv4/IPv6 地址池</p>
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
            创建 IP 池
          </Button>
        }
      />

      <PoolCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={table.refresh}
      />

      {editingPool && (
        <PoolEditDialog
          open={!!editingPool}
          onOpenChange={(open) => { if (!open) setEditingPool(null) }}
          pool={editingPool}
          onSuccess={table.refresh}
        />
      )}

      {generatePool && (
        <GenerateIPsDialog
          open={!!generatePool}
          onOpenChange={(open) => { if (!open) setGeneratePool(null) }}
          poolId={generatePool.id!}
          onSuccess={() => {
            setGeneratePool(null)
            table.refresh()
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  )
}
