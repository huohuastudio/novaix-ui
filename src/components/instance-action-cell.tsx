import { Play, Square, RotateCw, Pause, Zap, Pencil, Trash2, RefreshCw, RotateCcw, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { InstanceInstanceItem } from "@/api"
import type { PowerAction } from "@/hooks/use-instance-actions"

interface InstanceActionCellProps {
  instance: InstanceInstanceItem
  busy: boolean
  onPowerAction: (inst: InstanceInstanceItem, action: PowerAction) => void
  onEdit: (inst: InstanceInstanceItem) => void
  onDelete: (inst: InstanceInstanceItem) => void
  onRebuild?: (inst: InstanceInstanceItem) => void
  onRetry?: (inst: InstanceInstanceItem) => void
  onRenew?: (inst: InstanceInstanceItem) => void
}

function ActionButton({
  label,
  icon: Icon,
  busy,
  destructive,
  disabled,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  busy: boolean
  destructive?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          variant="ghost"
          size="icon"
          className={cn("size-8", destructive && "text-destructive hover:text-destructive")}
          disabled={disabled || busy}
          onClick={onClick}
        >
          {busy ? <Spinner size="sm" /> : <Icon className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const transientStatuses = new Set(["creating", "deleting", "suspending"])

export function InstanceActionCell({
  instance: inst,
  busy,
  onPowerAction,
  onEdit,
  onDelete,
  onRebuild,
  onRetry,
  onRenew,
}: InstanceActionCellProps) {
  const inTransition = transientStatuses.has(inst.status ?? "")

  const isRunning = inst.status === "running"
  const isFrozen = inst.status === "frozen"
  const isError = inst.status === "error"
  const canStart = inst.status === "stopped" || isFrozen || isError
  const canRenew = !!onRenew && !!inst.plan_id && !inTransition && !isError
  const canForceStop = isRunning || isFrozen || isError
  const canRebuild = (inst.status === "stopped" || isError) && !!onRebuild
  const canRetry = isError && !!onRetry
  const hasMoreActions = canRenew || isRunning || isFrozen || canRetry || canForceStop || canRebuild

  // 表格里只保留最常用的电源操作和编辑，其余收进“更多”菜单，避免操作列过宽
  return (
    <div className="flex items-center gap-1">
      {canStart && (
        <ActionButton label="启动" icon={Play} busy={busy} onClick={() => onPowerAction(inst, "start")} />
      )}
      {isRunning && (
        <>
          <ActionButton label="重启" icon={RotateCw} busy={busy} onClick={() => onPowerAction(inst, "restart")} />
          <ActionButton label="停止" icon={Square} busy={busy} onClick={() => onPowerAction(inst, "stop")} />
        </>
      )}
      <ActionButton label="编辑" icon={Pencil} busy={false} disabled={inTransition} onClick={() => onEdit(inst)} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="更多操作">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canRenew && (
            <DropdownMenuItem onClick={() => onRenew!(inst)}><RefreshCw />续费</DropdownMenuItem>
          )}
          {isRunning && (
            <DropdownMenuItem disabled={busy} onClick={() => onPowerAction(inst, "freeze")}><Pause />冻结</DropdownMenuItem>
          )}
          {isFrozen && (
            <DropdownMenuItem disabled={busy} onClick={() => onPowerAction(inst, "unfreeze")}><Play />解冻</DropdownMenuItem>
          )}
          {canRetry && (
            <DropdownMenuItem onClick={() => onRetry!(inst)}><RotateCw />重试</DropdownMenuItem>
          )}
          {canForceStop && (
            <DropdownMenuItem variant="destructive" disabled={busy} onClick={() => onPowerAction(inst, "force-stop")}><Zap />强制停止</DropdownMenuItem>
          )}
          {canRebuild && (
            <DropdownMenuItem variant="destructive" disabled={busy} onClick={() => onRebuild!(inst)}><RotateCcw />重建</DropdownMenuItem>
          )}
          {hasMoreActions && <DropdownMenuSeparator />}
          <DropdownMenuItem variant="destructive" disabled={inTransition || busy} onClick={() => onDelete(inst)}><Trash2 />删除</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
