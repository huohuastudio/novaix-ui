import { useMemo } from "react"
import {
  postAdminPlanGroups,
  putAdminPlanGroupsById,
  deleteAdminPlanGroupsById,
} from "@/api"
import type { ProductPlanGroupItem, GetAdminPlanGroupsResponse } from "@/api"
import { getAdminPlanGroupsOptions } from "@/api/@tanstack/react-query.gen"
import GroupDialog, { type GroupDialogConfig } from "@/components/group-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export default function PlanGroupDialog({ open, onOpenChange, onChanged }: Props) {
  const config = useMemo<GroupDialogConfig<ProductPlanGroupItem, GetAdminPlanGroupsResponse>>(() => ({
    title: "套餐分组管理",
    description: "为套餐创建分组，便于在列表中归类筛选",
    deleteWarning: "分组下不能有套餐。",
    placeholder: "云服务器",
    // 与套餐列表页的分组字典共享同一缓存条目（查询参数须与 plans/index.tsx 保持一致才能同 key）
    queryOptions: getAdminPlanGroupsOptions({ query: { page: 1, page_size: 100 } }),
    selectGroups: (res) => res?.data?.items ?? [],
    createFn: (body) => postAdminPlanGroups({ body }),
    updateFn: (id, body) => putAdminPlanGroupsById({ path: { id }, body }),
    deleteFn: (id) => deleteAdminPlanGroupsById({ path: { id } }),
    renderDetail: (g) => <> · 套餐 {g.plan_count ?? 0}</>,
  }), [])

  return (
    <GroupDialog
      open={open}
      onOpenChange={onOpenChange}
      onChanged={onChanged}
      config={config}
    />
  )
}
