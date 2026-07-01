import { useCallback, useState } from "react"
import { Pencil, Trash2, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useConfirm } from "@/hooks/use-confirm"
import { useNodeProfiles } from "@/hooks/use-node-profiles"
import { incus, incusErrorMessage } from "@/lib/incus"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IncusProfile } from "@/types/incus"
import { ProfileCreateSheet } from "@/components/profile-create-sheet"
import { ProfileEditSheet } from "@/components/profile-edit-sheet"

export function ProfileTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-14" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-12" /></TableHead>
            <TableHead><Skeleton className="h-3.5 w-14" /></TableHead>
            <TableHead className="w-24"><Skeleton className="h-3.5 w-12" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-10" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface NodeProfileTableProps {
  nodeId: number
}

export default function NodeProfileTable({ nodeId }: NodeProfileTableProps) {
  const { profiles, loading, refetch } = useNodeProfiles(nodeId)
  const { confirm, ConfirmDialog } = useConfirm()
  const [createOpen, setCreateOpen] = useState(false)
  const [editState, setEditState] = useState({ open: false, profileName: "" })

  const handleDelete = useCallback(async (profile: IncusProfile) => {
    if (profile.name === "default") {
      toast.error("不能删除默认配置文件")
      return
    }
    const usedCount = profile.used_by?.length ?? 0
    if (usedCount > 0) {
      toast.error(`配置文件正在被 ${usedCount} 个实例使用，无法删除`)
      return
    }
    const ok = await confirm({
      title: "删除配置文件",
      description: `确定要删除配置文件「${profile.name}」吗？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      await incus(nodeId, `1.0/profiles/${profile.name}`, { method: "DELETE" })
      toast.success("配置文件已删除")
      refetch()
    } catch (err) {
      toast.error(incusErrorMessage(err, "删除配置文件失败"))
    }
  }, [nodeId, confirm, refetch])

  const handleCreateSuccess = useCallback(() => {
    setCreateOpen(false)
    refetch()
  }, [refetch])

  const handleEditSuccess = useCallback(() => {
    setEditState((prev) => ({ ...prev, open: false }))
    refetch()
  }, [refetch])

  if (loading) {
    return <ProfileTableSkeleton />
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            管理该节点上的配置文件，配置文件可在创建实例时引用
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            创建配置文件
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>配置项</TableHead>
              <TableHead>设备</TableHead>
              <TableHead>使用中</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无配置文件
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">
                    {p.name}
                    {p.name === "default" && (
                      <Badge variant="secondary" className="ml-2 text-xs">默认</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.description || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {Object.keys(p.config ?? {}).length || "默认"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.devices ? Object.keys(p.devices).length : 0}
                  </TableCell>
                  <TableCell>
                    {(p.used_by?.length ?? 0) > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {p.used_by!.length} 个实例
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditState({ open: true, profileName: p.name! })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p)}
                        disabled={p.name === "default"}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProfileCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        nodeId={nodeId}
        onSuccess={handleCreateSuccess}
      />

      <ProfileEditSheet
        open={editState.open}
        onOpenChange={(open) => setEditState((prev) => ({ ...prev, open }))}
        nodeId={nodeId}
        profileName={editState.profileName}
        onSuccess={handleEditSuccess}
      />

      {ConfirmDialog}
    </>
  )
}
