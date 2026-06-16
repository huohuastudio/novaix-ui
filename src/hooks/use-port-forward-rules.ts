import { useEffect, useState, useCallback } from "react"
import type { ServicePortForwardRuleItem, ServicePortForwardRuleInput } from "@/api"
import { getErrorMessage } from "@/lib/utils"
import { toast } from "sonner"

export const protocolOptions = [
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
]

const defaultFormData: ServicePortForwardRuleInput = {
  protocol: "tcp",
  listen_port: "",
  connect_port: "",
  description: "",
  enabled: true,
}

interface PortForwardAPI {
  list: (opts: { path: { id: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  create: (opts: { path: { id: number }; body: ServicePortForwardRuleInput }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  update: (opts: { path: { id: number; ruleId: number }; body: ServicePortForwardRuleInput }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
  remove: (opts: { path: { id: number; ruleId: number } }) => Promise<{ data?: { code?: number; data?: unknown; message?: string } }>
}

export function usePortForwardRules(instanceId: number, api: PortForwardAPI) {
  const [rules, setRules] = useState<ServicePortForwardRuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ServicePortForwardRuleItem | null>(null)
  const [formData, setFormData] = useState<ServicePortForwardRuleInput>(defaultFormData)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<ServicePortForwardRuleItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      const { data: res } = await api.list({ path: { id: instanceId } })
      if (res?.code === 0 && res.data) {
        setRules(res.data as ServicePortForwardRuleItem[])
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "获取端口转发规则失败"))
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

  const openEdit = (rule: ServicePortForwardRuleItem) => {
    setEditingRule(rule)
    setFormData({
      protocol: rule.protocol ?? "tcp",
      listen_port: rule.listen_port ?? "",
      connect_port: rule.connect_port ?? "",
      description: rule.description ?? "",
      enabled: rule.enabled ?? true,
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
