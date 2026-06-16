import { useMemo } from "react"
import { Shield, Plus, Pencil, Trash2 } from "lucide-react"
import {
  getAdminInstancesByIdFirewallRules,
  postAdminInstancesByIdFirewallRules,
  putAdminInstancesByIdFirewallRulesByRuleId,
  deleteAdminInstancesByIdFirewallRulesByRuleId,
} from "@/api"
import { useFirewallRules, directionMap, actionMap } from "@/hooks/use-firewall-rules"
import { FirewallRuleFormDialog, FirewallDeleteDialog } from "@/components/firewall-rule-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

const actionBadgeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  allow: "default",
  reject: "secondary",
  drop: "destructive",
}

export function FirewallSection({ instanceId }: { instanceId: number }) {
  const api = useMemo(() => ({
    list: getAdminInstancesByIdFirewallRules,
    create: postAdminInstancesByIdFirewallRules,
    update: putAdminInstancesByIdFirewallRulesByRuleId,
    remove: deleteAdminInstancesByIdFirewallRulesByRuleId,
  }), [])

  const fw = useFirewallRules(instanceId, api)

  if (fw.loading) return <FirewallSkeleton />

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">防火墙规则</h3>
            <p className="text-sm text-muted-foreground mt-1">管理实例的入站和出站流量规则，变更会自动同步到节点</p>
          </div>
          <Button onClick={fw.openCreate}>
            <Plus className="size-4" />
            添加规则
          </Button>
        </div>

        {fw.rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">暂无防火墙规则</p>
            <p className="text-xs text-muted-foreground mt-1">所有流量将按照默认策略放行（出站允许，入站无限制）</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fw.rules.map((rule) => {
              const action = actionMap[rule.action ?? "drop"] ?? actionMap.drop
              const portInfo = rule.destination_port || rule.source_port
                ? `:${rule.destination_port || rule.source_port}`
                : ""
              return (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between rounded-md border px-4 py-3 ${rule.enabled === false ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Shield className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant="outline">{directionMap[rule.direction ?? ""] ?? rule.direction}</Badge>
                      <Badge variant={actionBadgeVariant[rule.action ?? "drop"] ?? "destructive"}>{action.label}</Badge>
                      {rule.protocol && (
                        <span className="text-xs font-mono uppercase text-muted-foreground">{rule.protocol}</span>
                      )}
                      {(rule.source || rule.destination) && (
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                          {rule.source || "*"} → {rule.destination || "*"}
                        </span>
                      )}
                      {portInfo && (
                        <span className="text-xs font-mono text-muted-foreground">{portInfo}</span>
                      )}
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
                    <span className="text-xs text-muted-foreground tabular-nums mr-2 hidden sm:inline">
                      P{rule.priority}
                    </span>
                    <Button variant="ghost" onClick={() => fw.openEdit(rule)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => fw.setDeleteConfirm(rule)}
                    >
                      <Trash2 className="size-4" />
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

function FirewallSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-28" />
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
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-4 w-24" />
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
