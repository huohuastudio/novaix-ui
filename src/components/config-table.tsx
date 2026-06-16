import type { ReactNode } from "react"
import { RotateCcw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ConfigRowItem {
  key: string
  label: string
  description?: string
  children: ReactNode
  instanceType?: "container" | "virtual-machine"
  onReset?: () => void
}

interface ConfigTableProps {
  rows: ConfigRowItem[]
  currentInstanceType?: "container" | "virtual-machine"
}

export function ConfigTable({ rows, currentInstanceType }: ConfigTableProps) {
  const filtered = rows.filter(
    (r) => !r.instanceType || r.instanceType === currentInstanceType
  )

  if (filtered.length === 0) return null

  return (
    <>
      {/* 桌面端：表格 */}
      <div className="hidden sm:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">配置项</TableHead>
              <TableHead>值</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="align-top py-2.5">
                  <div className="font-medium text-sm">{row.label}</div>
                  {row.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-2.5">
                  {row.onReset ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">{row.children}</div>
                      <ResetButton onClick={row.onReset} />
                    </div>
                  ) : (
                    row.children
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 手机端：卡片堆叠 */}
      <div className="sm:hidden space-y-4">
        {filtered.map((row) => (
          <div key={row.key} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{row.label}</div>
                {row.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {row.description}
                  </div>
                )}
              </div>
              {row.onReset && <ResetButton onClick={row.onReset} />}
            </div>
            <div>{row.children}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClick}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>重置为默认值</TooltipContent>
    </Tooltip>
  )
}

interface ConfigSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function ConfigSection({ title, description, children }: ConfigSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

interface SwitchRowProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  typeTag?: "container" | "virtual-machine"
  disabled?: boolean
}

export function SwitchRow({
  checked,
  onCheckedChange,
  typeTag,
  disabled,
}: SwitchRowProps) {
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      <div className="w-16 shrink-0">
        {typeTag && (
          <Badge variant="outline" className="text-xs">
            {typeTag === "container" ? "仅容器" : "仅虚拟机"}
          </Badge>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {checked ? "启用" : "禁用"}
      </span>
    </div>
  )
}
