import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAdminPlansByIdOptions } from "@/api/@tanstack/react-query.gen"
import { FormSheet } from "@/components/form-sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import PlanFormDialog from "./plan-form-dialog"

interface Props {
  planId: number
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function PlanCopyDialog({ planId, onOpenChange, onSuccess }: Props) {
  const query = useQuery({
    ...getAdminPlansByIdOptions({ path: { id: planId } }),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const source = query.data?.data
  const initialPlan = useMemo(() => source ? {
    ...source,
    name: `${Array.from(source.name ?? "套餐").slice(0, 124).join("")}（副本）`,
    stock: 0,
    status: 0,
  } : undefined, [source])
  const description = "配置和价格已复制。请检查可用节点、网络和库存，副本默认下架；保存后与原套餐独立维护。"

  if (query.isFetching || query.isError || !initialPlan) {
    return (
      <FormSheet
        open
        onOpenChange={onOpenChange}
        title="复制套餐"
        description={description}
        footer={<Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>}
      >
        {query.isError ? (
          <div className="space-y-3 px-4">
            <p className="text-sm text-destructive">读取原套餐失败，请重试或关闭后刷新列表。</p>
            <Button variant="outline" onClick={() => query.refetch()}>重试</Button>
          </div>
        ) : (
          <div className="space-y-6 px-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          </div>
        )}
      </FormSheet>
    )
  }

  return (
    <PlanFormDialog
      open
      onOpenChange={onOpenChange}
      initialPlan={initialPlan}
      title="复制套餐"
      description={description}
      onSuccess={onSuccess}
    />
  )
}
