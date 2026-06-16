import { useEffect, useState, useCallback } from "react"
import type { ServiceFirewallRuleItem, ServiceFirewallRuleInput } from "@/api"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"

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
  list: (opts: { path: { id: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  create: (opts: { path: { id: number }; body: ServiceFirewallRuleInput }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  update: (opts: { path: { id: number; ruleId: number }; body: ServiceFirewallRuleInput }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  remove: (opts: { path: { id: number; ruleId: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
}

export function useFirewallRules(instanceId: number, api: FirewallAPI) {
  const [rules, setRules] = useState<ServiceFirewallRuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ServiceFirewallRuleItem | null>(null)
  const [formData, setFormData] = useState<ServiceFirewallRuleInput>(defaultFormData)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceFirewallRuleItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      const { data: res } = await api.list({ path: { id: instanceId } })
      if (res?.code === 0 && res.data) {
        setRules(res.data as ServiceFirewallRuleItem[])
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "获取防火墙规则失败"))
    } finally {
      setLoading(false)
    }
  }, [instanceId, api])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    fetchRules()
  }, [fetchRules])

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
          fetchRules()
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
          fetchRules()
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
        fetchRules()
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
    rules,
    loading,
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
