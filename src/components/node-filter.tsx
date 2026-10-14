import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAdminNodes } from "@/api"
import { getAdminNodesOptions } from "@/api/@tanstack/react-query.gen"
import { PaginatedSelect } from "@/components/paginated-select"

const PAGE_SIZE = 20

async function fetchNodes(page: number, keyword: string) {
  const { data: res } = await getAdminNodes({
    query: { page, page_size: PAGE_SIZE, keyword: keyword || undefined },
    throwOnError: true,
  })
  return {
    items: (res.data?.items ?? []).map((node) => ({
      id: String(node.id),
      label: node.name ?? `节点 #${node.id}`,
      description: node.host,
    })),
    hasMore: page * PAGE_SIZE < (res.data?.total ?? 0),
  }
}

export function NodeFilter({ value, onChange }: {
  value: string
  onChange: (value: string) => void
}) {
  // 用列表接口回填名称，刷新后也能显示分页之外的节点，不额外要求详情权限。
  const { data } = useQuery({
    ...getAdminNodesOptions({ query: { ids: value, page_size: 1 } }),
    enabled: !!value,
  })
  const node = data?.data?.items?.[0]
  const initialItem = useMemo(() => value ? {
    id: value,
    label: node?.name ?? `节点 #${value}`,
  } : undefined, [value, node?.name])

  return (
    <PaginatedSelect
      value={value}
      onChange={onChange}
      fetchFn={fetchNodes}
      initialItem={initialItem}
      placeholder="节点"
      aria-label="节点筛选"
      searchPlaceholder="搜索节点名称或地址..."
      emptyText="未找到匹配的节点"
      className="h-8 w-[calc(50%-0.25rem)] min-w-0 sm:w-[150px]"
    />
  )
}
