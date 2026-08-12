import { useCallback, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Ticket } from "lucide-react"
import { getAdminCouponsByIdUsages } from "@/api"
import type { CouponCouponItem, CouponUsageItem } from "@/api"
import {
  getAdminCouponsByIdOptions,
  getAdminCouponsByIdUsagesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { useDataTable, type FetchParams } from "@/hooks/use-data-table"
import { useFormatAmount, useFormatDate, useAdminPath } from "@/hooks/use-site-settings"
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { UserPopover } from "@/components/user-popover"
import { OrderPopover } from "@/components/order-popover"

function DetailSkeleton() {
  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function CouponDetail() {
  const { id } = useParams<{ id: string }>()
  const adminPath = useAdminPath()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const couponQuery = useQuery({
    ...getAdminCouponsByIdOptions({ path: { id: Number(id) } }),
    enabled: !!id,
  })
  const coupon: CouponCouponItem | null =
    couponQuery.data?.code === 0 && couponQuery.data.data ? couponQuery.data.data : null
  const loading = couponQuery.isPending

  useBreadcrumb([
    { label: "优惠券管理", href: `${adminPath}/coupons` },
    { label: coupon?.code ?? "详情" },
  ])

  const fetchUsages = useCallback(async ({ page, pageSize }: FetchParams) => {
    const { data: res } = await getAdminCouponsByIdUsages({
      path: { id: Number(id) },
      query: { page, page_size: pageSize },
    })
    return {
      items: res?.data?.items ?? [],
      total: res?.data?.total ?? 0,
      page: res?.data?.page ?? 1,
      page_size: res?.data?.page_size ?? pageSize,
    }
  }, [id])

  // couponId（路由参数）是 fetchUsages 的闭包变量，传入 key 函数避免切换优惠券时命中旧缓存
  const usageTable = useDataTable<CouponUsageItem>({
    fetchFn: fetchUsages,
    queryKey: getAdminCouponsByIdUsagesQueryKey({ path: { id: Number(id) } }),
  })

  const usageColumns: ColumnDef<CouponUsageItem>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "username",
      header: "用户",
      cell: ({ row }) => (
        <UserPopover userId={row.original.user_id} username={row.original.username} />
      ),
    },
    {
      accessorKey: "order_no",
      header: "关联订单",
      cell: ({ row }) => (
        <OrderPopover orderId={row.original.order_id} label={row.original.order_no} />
      ),
    },
    {
      accessorKey: "created_at",
      header: "使用时间",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ], [formatDate])

  if (loading) return <DetailSkeleton />
  if (!coupon) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
        <p className="text-muted-foreground">优惠券不存在</p>
        <Button variant="outline" asChild>
          <Link to={`${adminPath}/coupons`}>返回列表</Link>
        </Button>
      </div>
    )
  }

  const isActive = coupon.enabled
  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
  const usageText = coupon.usage_limit
    ? `${coupon.used_count ?? 0} / ${coupon.usage_limit}`
    : `${coupon.used_count ?? 0} / ∞`

  return (
    <div className="px-6 pt-6 space-y-6">
      <div className="flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to={`${adminPath}/coupons`}><ArrowLeft className="size-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight font-mono">{coupon.code}</h1>
        <Badge variant={isActive && !isExpired ? "default" : "secondary"}>
          {!isActive ? "禁用" : isExpired ? "已过期" : "启用"}
        </Badge>
      </div>

      <section>
        <h3 className="text-lg font-semibold">基本信息</h3>
        <p className="text-sm text-muted-foreground mt-1">优惠券配置详情</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-sm mt-4 max-w-3xl">
          <div>
            <div className="text-muted-foreground">类型</div>
            <div className="font-medium mt-0.5">
              {coupon.type === "fixed" ? "固定金额" : "百分比"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">面值</div>
            <div className="font-medium mt-0.5">
              {coupon.type === "fixed"
                ? formatAmount(coupon.value)
                : `${((coupon.value ?? 0) / 100).toFixed(2)}%`}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">最低消费</div>
            <div className="font-medium mt-0.5">
              {coupon.min_order_amount ? formatAmount(coupon.min_order_amount) : "无限制"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">最大折扣</div>
            <div className="font-medium mt-0.5">
              {coupon.max_discount ? formatAmount(coupon.max_discount) : "无限制"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">使用量</div>
            <div className="font-medium mt-0.5">{usageText}</div>
          </div>
          <div>
            <div className="text-muted-foreground">每人限用</div>
            <div className="font-medium mt-0.5">{coupon.per_user_limit || "不限"} 次</div>
          </div>
          <div>
            <div className="text-muted-foreground">适用类型</div>
            <div className="font-medium mt-0.5">
              {coupon.applicable_types
                ? coupon.applicable_types.split(",").map(t => {
                    const m: Record<string, string> = { new: "新购", renew: "续费", upgrade: "升级" }
                    return m[t.trim()] ?? t.trim()
                  }).join("、")
                : "全部"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">创建时间</div>
            <div className="font-medium mt-0.5">{formatDate(coupon.created_at)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">生效时间</div>
            <div className="font-medium mt-0.5">
              {coupon.starts_at ? formatDate(coupon.starts_at) : "立即生效"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">过期时间</div>
            <div className="font-medium mt-0.5">
              {coupon.expires_at ? formatDate(coupon.expires_at) : "永不过期"}
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col flex-1 min-h-0 gap-4">
        <div>
          <h3 className="text-lg font-semibold">使用记录</h3>
          <p className="text-sm text-muted-foreground mt-1">该优惠券的所有使用记录</p>
        </div>
        <DataTable
          columns={usageColumns}
          data={usageTable.data}
          loading={usageTable.loading}
          fetching={usageTable.fetching}
          pagination={usageTable.pagination}
          onPaginationChange={usageTable.setPagination}
          sorting={usageTable.sorting}
          onSortingChange={usageTable.setSorting}
          columnFilters={usageTable.columnFilters}
          onColumnFiltersChange={usageTable.setColumnFilters}
          emptyIcon={Ticket}
          emptyTitle="暂无使用记录"
          emptyDescription="用户使用该优惠券后记录将显示在这里"
        />
      </section>
    </div>
  )
}
