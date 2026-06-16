import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getAdminUsersById } from "@/api"
import type { UserUserItem } from "@/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useFormatAmount, useFormatDate } from "@/hooks/use-site-settings"
import { useLazyPopover } from "@/hooks/use-lazy-popover"
import { roleMap } from "@/lib/user-constants"

const statusMap: Record<number, { label: string; className: string }> = {
  1: { label: "正常", className: "text-emerald-600" },
  0: { label: "禁用", className: "text-red-600" },
}

interface UserPopoverProps {
  userId?: number
  username?: string
}

export function UserPopover({ userId, username }: UserPopoverProps) {
  const { data: user, loading, handleOpen } = useLazyPopover<UserUserItem>(
    userId,
    (id) => getAdminUsersById({ path: { id } })
  )
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()

  const displayName = username || String(userId || "-")

  return (
    <Popover onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="text-primary hover:underline cursor-pointer">
          {displayName}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {loading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : user ? (
          <div className="p-4 space-y-2 text-sm">
            <div className="font-medium text-base">{user.username}</div>
            <div className="grid grid-cols-[4rem_1fr] gap-y-1.5 text-muted-foreground">
              <span>ID</span>
              <span className="text-foreground font-mono text-xs">{user.id}</span>
              <span>邮箱</span>
              <span className="text-foreground truncate">{user.email || "-"}</span>
              <span>角色</span>
              <span className="text-foreground">{roleMap[user.role ?? ""]?.label ?? user.role}</span>
              <span>状态</span>
              <span className={statusMap[user.status ?? 1]?.className ?? ""}>
                {statusMap[user.status ?? 1]?.label ?? "-"}
              </span>
              <span>余额</span>
              <span className="text-foreground">{formatAmount(user.balance)}</span>
              <span>注册</span>
              <span className="text-foreground">{formatDate(user.created_at)}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">未找到用户信息</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
