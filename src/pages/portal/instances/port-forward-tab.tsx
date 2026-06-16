import { useMemo } from "react"
import { ArrowUpDown, Plus, Pencil, Trash2 } from "lucide-react"
import {
  getPortalInstancesByIdPortForwardRules,
  postPortalInstancesByIdPortForwardRules,
  putPortalInstancesByIdPortForwardRulesByRuleId,
  deletePortalInstancesByIdPortForwardRulesByRuleId,
} from "@/api"
import { usePortForwardRules } from "@/hooks/use-port-forward-rules"
import { PortForwardRuleFormDialog, PortForwardDeleteDialog } from "@/components/port-forward-rule-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function PortForwardTab({ instanceId }: { instanceId: number }) {
  const api = useMemo(() => ({
    list: getPortalInstancesByIdPortForwardRules,
    create: postPortalInstancesByIdPortForwardRules,
    update: putPortalInstancesByIdPortForwardRulesByRuleId,
    remove: deletePortalInstancesByIdPortForwardRulesByRuleId,
  }), [])

  const pf = usePortForwardRules(instanceId, api)

  if (pf.loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="rounded-2xl bg-background divide-y divide-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">端口转发</h2>
          <Button onClick={pf.openCreate}>
            <Plus className="size-3.5" />
            添加规则
          </Button>
        </div>

        {pf.rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowUpDown className="size-10 text-muted-foreground/25 mb-3" />
            <p className="text-[13px] text-muted-foreground">暂无端口转发规则</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">添加规则将宿主机端口映射到实例内部</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {pf.rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted uppercase">
                      {rule.protocol}
                    </span>
                    <span className="text-[12px] text-muted-foreground font-mono">
                      0.0.0.0:{rule.listen_port}
                    </span>
                    <span className="text-[11px] text-muted-foreground">→</span>
                    <span className="text-[12px] text-muted-foreground font-mono">
                      127.0.0.1:{rule.connect_port}
                    </span>
                    {rule.enabled === false && (
                      <span className="text-[11px] text-muted-foreground/60">已禁用</span>
                    )}
                  </div>
                  {rule.description && (
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{rule.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => pf.openEdit(rule)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => pf.setDeleteConfirm(rule)}
                  >
                    <Trash2 className="size-3.5" />
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
