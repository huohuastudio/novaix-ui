import { useCallback, useMemo, type ComponentProps } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAdminPlans } from "@/api"
import { getAdminPlansOptions } from "@/api/@tanstack/react-query.gen"
import { PaginatedMultiSelect } from "@/components/paginated-multi-select"

interface Props extends Pick<ComponentProps<"button">, "id" | "aria-describedby" | "aria-invalid" | "ref"> {
  value: string[]
  onChange: (value: string[]) => void
}

export function PlanMultiSelect({ value, onChange, ...controlProps }: Props) {
  const selected = useQuery({
    ...getAdminPlansOptions({ query: { ids: value.join(","), page_size: 100 } }),
    enabled: value.length > 0,
  })
  const initialItems = useMemo(() => value.map(id => {
    const plan = selected.data?.data?.items?.find(item => String(item.id) === id)
    return { id, label: plan ? `${plan.name} (#${id})` : `套餐 #${id}` }
  }), [value, selected.data])
  const fetchPlans = useCallback(async (page: number, keyword: string) => {
    const { data } = await getAdminPlans({ query: { keyword: keyword || undefined, page, page_size: 20 } })
    const items = data?.data?.items ?? []
    return {
      items: items.map(plan => ({ id: String(plan.id), label: `${plan.name} (#${plan.id})` })),
      hasMore: page * 20 < (data?.data?.total ?? 0),
    }
  }, [])
  return <PaginatedMultiSelect {...controlProps} value={value} onChange={onChange} fetchFn={fetchPlans} initialItems={initialItems} placeholder="选择适用套餐" searchPlaceholder="搜索套餐名称..." emptyText="没有找到套餐" />
}
