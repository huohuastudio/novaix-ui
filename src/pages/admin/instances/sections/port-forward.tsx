import { useMemo } from "react"
import { ArrowUpDown, Plus, Pencil, Trash2 } from "lucide-react"
import {
  getAdminInstancesByIdPortForwardRules,
  postAdminInstancesByIdPortForwardRules,
  putAdminInstancesByIdPortForwardRulesByRuleId,
  deleteAdminInstancesByIdPortForwardRulesByRuleId,
} from "@/api"
import { usePortForwardRules } from "@/hooks/use-port-forward-rules"
import { PortForwardRuleFormDialog, PortForwardDeleteDialog } from "@/components/port-forward-rule-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export function PortForwardSection({ instanceId, isNAT }: { instanceId: number; isNAT?: boolean }) {
  const api = useMemo(() => ({
    list: getAdminInstancesByIdPortForwardRules,
    create: postAdminInstancesByIdPortForwardRules,
    update: putAdminInstancesByIdPortForwardRulesByRuleId,
    remove: deleteAdminInstancesByIdPortForwardRulesByRuleId,
  }), [])

  const pf = usePortForwardRules(instanceId, api)

  if (pf.loading) return <PortForwardSkeleton />

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">端口转发</h3>
            <p className="text-sm text-muted-foreground mt-1">将宿主机端口映射到实例内部端口，变更会自动同步到节点</p>
          </div>
          <Button onClick={pf.openCreate}>
            <Plus className="size-4" />
            添加规则
          </Button>
        </div>

        {pf.rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowUpDown className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">暂无端口转发规则</p>
            <p className="text-xs text-muted-foreground mt-1">添加规则将宿主机端口映射到实例内部</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pf.rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between rounded-md border px-4 py-3 ${rule.enabled === false ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ArrowUpDown className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Badge variant="outline" className="uppercase">{rule.protocol}</Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      {rule.listen_address || "0.0.0.0"}:{rule.listen_port}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      127.0.0.1:{rule.connect_port}
                    </span>
                    {rule.enabled === false && (
                      <Badge variant="outline" className="text-muted-foreground">已禁用</Badge>
                    )}
                  </div>
                  {rule.description && (
                    <span className="text-xs text-muted-foreground truncate hidden lg:inline">
                      {rule.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button variant="ghost" onClick={() => pf.openEdit(rule)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => pf.setDeleteConfirm(rule)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PortForwardRuleFormDialog
        open={pf.dialogOpen}
        onOpenChange={pf.setDialogOpen}
        editingRule={pf.editingRule}
        formData={pf.formData}
        setFormData={pf.setFormData}
        submitting={pf.submitting}
        onSubmit={pf.handleSubmit}
        isNAT={isNAT}
      />

      <PortForwardDeleteDialog
        rule={pf.deleteConfirm}
        onOpenChange={() => pf.setDeleteConfirm(null)}
        onConfirm={pf.handleDelete}
        deleting={pf.deleting}
      />
    </>
  )
}

function PortForwardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
