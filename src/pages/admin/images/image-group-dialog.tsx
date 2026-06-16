import { useMemo } from "react"
import {
  getAdminImageGroups,
  postAdminImageGroups,
  putAdminImageGroupsById,
  deleteAdminImageGroupsById,
} from "@/api"
import type { ImageGroupItem } from "@/api"
import GroupDialog, { type GroupDialogConfig } from "@/components/group-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export default function ImageGroupDialog({ open, onOpenChange, onChanged }: Props) {
  const config = useMemo<GroupDialogConfig<ImageGroupItem>>(() => ({
    title: "镜像分组管理",
    description: "为镜像创建分组，便于在列表中归类筛选",
    deleteWarning: "分组下不能有镜像。",
    placeholder: "主流系统",
    fetchFn: async () => {
      const { data: res } = await getAdminImageGroups()
      return res?.data ?? []
    },
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
