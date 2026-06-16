import { useMemo } from "react"
import { Shield, Plus, Pencil, Trash2 } from "lucide-react"
import {
  getPortalInstancesByIdFirewallRules,
  postPortalInstancesByIdFirewallRules,
  putPortalInstancesByIdFirewallRulesByRuleId,
  deletePortalInstancesByIdFirewallRulesByRuleId,
} from "@/api"
import { useFirewallRules, directionMap, actionMap } from "@/hooks/use-firewall-rules"
import { FirewallRuleFormDialog, FirewallDeleteDialog } from "@/components/firewall-rule-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function FirewallTab({ instanceId }: { instanceId: number }) {
  const api = useMemo(() => ({
    list: getPortalInstancesByIdFirewallRules,
    create: postPortalInstancesByIdFirewallRules,
    update: putPortalInstancesByIdFirewallRulesByRuleId,
    remove: deletePortalInstancesByIdFirewallRulesByRuleId,
  }), [])

  const fw = useFirewallRules(instanceId, api)

  if (fw.loading) {
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
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">防火墙规则</h2>
          <Button onClick={fw.openCreate}>
            <Plus className="size-3.5" />
            添加规则
          </Button>
        </div>

        {fw.rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="size-10 text-muted-foreground/25 mb-3" />
            <p className="text-[13px] text-muted-foreground">暂无防火墙规则</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1">添加规则来控制实例的网络访问</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {fw.rules.map((rule) => {
              const action = actionMap[rule.action ?? "drop"] ?? actionMap.drop
              return (
                <div key={rule.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted">
                        {directionMap[rule.direction ?? ""] ?? rule.direction}
                      </span>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${action.className}`}>
                        {action.label}
                      </span>
                      {rule.protocol && (
                        <span className="text-[12px] text-muted-foreground font-mono uppercase">{rule.protocol}</span>
                      )}
                      {(rule.source || rule.destination) && (
                        <span className="text-[12px] text-muted-foreground font-mono truncate">
                          {rule.source && `${rule.source}`}
                          {rule.source && rule.destination && " → "}
                          {rule.destination && `${rule.destination}`}
                        </span>
                      )}
                      {(rule.destination_port || rule.source_port) && (
                        <span className="text-[12px] text-muted-foreground font-mono">
                          :{rule.destination_port || rule.source_port}
                        </span>
                      )}
                      {rule.enabled === false && (
                        <span className="text-[11px] text-muted-foreground/60">已禁用</span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{rule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => fw.openEdit(rule)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => fw.setDeleteConfirm(rule)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <FirewallRuleFormDialog
        open={fw.dialogOpen}
        onOpenChange={fw.setDialogOpen}
        editingRule={fw.editingRule}
        formData={fw.formData}
        setFormData={fw.setFormData}
        submitting={fw.submitting}
        onSubmit={fw.handleSubmit}
      />

      <FirewallDeleteDialog
        rule={fw.deleteConfirm}
        onOpenChange={() => fw.setDeleteConfirm(null)}
        onConfirm={fw.handleDelete}
        deleting={fw.deleting}
      />
    </>
  )
}
