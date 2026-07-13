import { useMemo } from "react"
import {
  postAdminImageGroups,
  putAdminImageGroupsById,
  deleteAdminImageGroupsById,
} from "@/api"
import type { ImageGroupItem, GetAdminImageGroupsResponse } from "@/api"
import { getAdminImageGroupsOptions } from "@/api/@tanstack/react-query.gen"
import GroupDialog, { type GroupDialogConfig } from "@/components/group-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export default function ImageGroupDialog({ open, onOpenChange, onChanged }: Props) {
  const config = useMemo<GroupDialogConfig<ImageGroupItem, GetAdminImageGroupsResponse>>(() => ({
    title: "镜像分组管理",
    description: "为镜像创建分组，便于在列表中归类筛选",
    deleteWarning: "分组下不能有镜像。",
    placeholder: "主流系统",
    // 与镜像列表页的分组字典共享同一缓存条目（无参数调用，同 key）
    queryOptions: getAdminImageGroupsOptions(),
    selectGroups: (res) => res?.data ?? [],
    createFn: (body) => postAdminImageGroups({ body }),
    updateFn: (id, body) => putAdminImageGroupsById({ path: { id }, body }),
    deleteFn: (id) => deleteAdminImageGroupsById({ path: { id } }),
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
