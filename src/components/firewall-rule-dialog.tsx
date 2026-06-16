import type { ServiceFirewallRuleItem, ServiceFirewallRuleInput } from "@/api"
import { PROTOCOL_ALL, protocolOptions } from "@/hooks/use-firewall-rules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface FirewallRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingRule: ServiceFirewallRuleItem | null
  formData: ServiceFirewallRuleInput
  setFormData: React.Dispatch<React.SetStateAction<ServiceFirewallRuleInput>>
  submitting: boolean
  onSubmit: () => void
}

export function FirewallRuleFormDialog({
  open,
  onOpenChange,
  editingRule,
  formData,
  setFormData,
  submitting,
  onSubmit,
}: FirewallRuleFormDialogProps) {
  const isIcmp = formData.protocol === "icmp4"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingRule ? "编辑规则" : "添加规则"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>方向</Label>
              <Select
                value={formData.direction}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, direction: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="shadow-sm ring-0">
                  <SelectItem value="ingress">入站</SelectItem>
                  <SelectItem value="egress">出站</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>动作</Label>
              <Select
                value={formData.action}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, action: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="shadow-sm ring-0">
                  <SelectItem value="allow">允许</SelectItem>
                  <SelectItem value="reject">拒绝</SelectItem>
                  <SelectItem value="drop">丢弃</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>协议</Label>
            <Select
              value={formData.protocol || PROTOCOL_ALL}
              onValueChange={(v) => {
                const proto = v === PROTOCOL_ALL ? "" : v
                setFormData((prev) => ({
                  ...prev,
                  protocol: proto,
                  ...(proto === "icmp4" ? { source_port: "", destination_port: "" } : {}),
                }))
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="shadow-sm ring-0">
                {protocolOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>源地址</Label>
              <Input
                placeholder="例: 0.0.0.0/0"
                value={formData.source ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>目标地址</Label>
              <Input
                placeholder="例: 10.0.0.0/8"
                value={formData.destination ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
              />
            </div>
          </div>

          {!isIcmp && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>源端口</Label>
                <Input
                  placeholder="例: 1024-65535"
                  value={formData.source_port ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, source_port: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>目标端口</Label>
                <Input
                  placeholder="例: 80,443"
                  value={formData.destination_port ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, destination_port: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>描述</Label>
            <Input
              placeholder="规则描述（可选）"
              value={formData.description ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>优先级</Label>
              <Input
                type="number"
                min={0}
                max={999}
                value={formData.priority ?? 100}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={formData.enabled ?? true}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, enabled: v }))}
              />
              <Label>启用</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <Spinner />}
            {editingRule ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FirewallDeleteDialogProps {
  rule: ServiceFirewallRuleItem | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  deleting: boolean
}

export function FirewallDeleteDialog({
  rule,
  onOpenChange,
  onConfirm,
  deleting,
}: FirewallDeleteDialogProps) {
  return (
    <AlertDialog open={rule !== null} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除防火墙规则</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除这条防火墙规则吗？删除后将自动同步到节点。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={deleting}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
