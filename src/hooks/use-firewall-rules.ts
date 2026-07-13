import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ServiceFirewallRuleItem, ServiceFirewallRuleInput } from "@/api"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"
import { queryKeys } from "@/lib/query-keys"
import { useQueryErrorToast } from "@/hooks/use-query-error-toast"

export const PROTOCOL_ALL = "_all"

export const directionMap: Record<string, string> = {
  ingress: "入站",
  egress: "出站",
}

export const actionMap: Record<string, { label: string; className: string }> = {
  allow: { label: "允许", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  reject: { label: "拒绝", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  drop: { label: "丢弃", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
}

export const protocolOptions = [
  { value: PROTOCOL_ALL, label: "全部" },
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
  { value: "icmp4", label: "ICMP" },
]

const defaultFormData: ServiceFirewallRuleInput = {
  direction: "ingress",
  action: "drop",
  protocol: "",
  source: "",
  destination: "",
  source_port: "",
  destination_port: "",
  description: "",
  enabled: true,
  priority: 100,
}

interface FirewallAPI {
  /** 端标识，区分 admin/portal 两端的查询缓存（不能用函数名判别：生产压缩会 mangle 函数名） */
  scope: "admin" | "portal"
  list: (opts: { path: { id: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  create: (opts: { path: { id: number }; body: ServiceFirewallRuleInput }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  update: (opts: { path: { id: number; ruleId: number }; body: ServiceFirewallRuleInput }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  remove: (opts: { path: { id: number; ruleId: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
}

export function useFirewallRules(instanceId: number, api: FirewallAPI) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ServiceFirewallRuleItem | null>(null)
  const [formData, setFormData] = useState<ServiceFirewallRuleInput>(defaultFormData)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceFirewallRuleItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // api 经参数注入（admin/portal 两端接口不同），用 scope 字段作为 key 判别符区分缓存
  const queryKey = queryKeys.firewallRules(api.scope, instanceId)

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: res } = await api.list({ path: { id: instanceId } })
      if (res?.code === 0 && res.data) {
        return res.data as ServiceFirewallRuleItem[]
      }
      return []
    },
  })

  useQueryErrorToast(query.error, "获取防火墙规则失败")

  const invalidateRules = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const openCreate = () => {
    setEditingRule(null)
    setFormData(defaultFormData)
    setDialogOpen(true)
  }

  const openEdit = (rule: ServiceFirewallRuleItem) => {
    setEditingRule(rule)
    setFormData({
      direction: rule.direction ?? "ingress",
      action: rule.action ?? "drop",
      protocol: rule.protocol ?? "",
      source: rule.source ?? "",
      destination: rule.destination ?? "",
      source_port: rule.source_port ?? "",
      destination_port: rule.destination_port ?? "",
      description: rule.description ?? "",
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 100,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (editingRule) {
        const { data: res } = await api.update({
          path: { id: instanceId, ruleId: editingRule.id! },
          body: formData,
        })
        if (res?.code === 0) {
          toast.success("规则已更新")
          setDialogOpen(false)
          invalidateRules()
        } else {
          toast.error(res?.message || "更新规则失败")
        }
      } else {
        const { data: res } = await api.create({
          path: { id: instanceId },
          body: formData,
        })
        if (res?.code === 0) {
          toast.success("规则已创建")
          setDialogOpen(false)
          invalidateRules()
        } else {
          toast.error(res?.message || "创建规则失败")
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, editingRule ? "更新规则失败" : "创建规则失败"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm?.id) return
    setDeleting(true)
    try {
      const { data: res } = await api.remove({
        path: { id: instanceId, ruleId: deleteConfirm.id },
      })
      if (res?.code === 0) {
        toast.success("规则已删除")
        setDeleteConfirm(null)
        invalidateRules()
      } else {
        toast.error(res?.message || "删除规则失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "删除规则失败"))
    } finally {
      setDeleting(false)
    }
  }

  return {
    rules: query.data ?? [],
    loading: query.isPending,
    dialogOpen,
    setDialogOpen,
    editingRule,
    formData,
    setFormData,
    submitting,
    deleteConfirm,
    setDeleteConfirm,
    deleting,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
  }
}
