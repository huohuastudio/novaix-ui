import { useMemo } from "react"
import {
  getAdminPlanGroups,
  postAdminPlanGroups,
  putAdminPlanGroupsById,
  deleteAdminPlanGroupsById,
} from "@/api"
import type { ProductPlanGroupItem } from "@/api"
import GroupDialog, { type GroupDialogConfig } from "@/components/group-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export default function PlanGroupDialog({ open, onOpenChange, onChanged }: Props) {
  const config = useMemo<GroupDialogConfig<ProductPlanGroupItem>>(() => ({
    title: "套餐分组管理",
    description: "为套餐创建分组，便于在列表中归类筛选",
    deleteWarning: "分组下不能有套餐。",
    placeholder: "云服务器",
    fetchFn: async () => {
      const { data: res } = await getAdminPlanGroups({ query: { page: 1, page_size: 100 } })
      return res?.data?.items ?? []
    },
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
