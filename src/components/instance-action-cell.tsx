import { Play, Square, RotateCw, Pause, Zap, Pencil, Trash2, RefreshCw } from "lucide-react"
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
  onRetry,
  onRenew,
}: InstanceActionCellProps) {
  const inTransition = transientStatuses.has(inst.status ?? "")

  return (
    <div className="flex items-center gap-1">
      {onRenew && inst.plan_id && !inTransition && inst.status !== "error" && (
        <ActionButton label="续费" icon={RefreshCw} busy={false} onClick={() => onRenew(inst)} />
      )}
      {(inst.status === "stopped" || inst.status === "frozen") && (
        <ActionButton label="启动" icon={Play} busy={busy} onClick={() => onPowerAction(inst, "start")} />
      )}
      {inst.status === "running" && (
        <>
          <ActionButton label="重启" icon={RotateCw} busy={busy} onClick={() => onPowerAction(inst, "restart")} />
          <ActionButton label="停止" icon={Square} busy={busy} onClick={() => onPowerAction(inst, "stop")} />
          <ActionButton label="冻结" icon={Pause} busy={busy} onClick={() => onPowerAction(inst, "freeze")} />
        </>
      )}
      {inst.status === "frozen" && (
        <ActionButton label="解冻" icon={Play} busy={busy} onClick={() => onPowerAction(inst, "unfreeze")} />
      )}
      {(inst.status === "running" || inst.status === "frozen") && (
        <ActionButton label="强制停止" icon={Zap} busy={busy} destructive onClick={() => onPowerAction(inst, "force-stop")} />
      )}
      {inst.status === "error" && onRetry && (
        <ActionButton label="重试" icon={RotateCw} busy={false} onClick={() => onRetry(inst)} />
      )}
      <ActionButton label="编辑" icon={Pencil} busy={false} disabled={inTransition} onClick={() => onEdit(inst)} />
      <ActionButton label="删除" icon={Trash2} busy={false} destructive disabled={inst.status === "running" || inTransition || busy} onClick={() => onDelete(inst)} />
    </div>
  )
}
