import type { ServicePortForwardRuleItem, ServicePortForwardRuleInput } from "@/api"
import { protocolOptions } from "@/hooks/use-port-forward-rules"
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

interface PortForwardRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingRule: ServicePortForwardRuleItem | null
  formData: ServicePortForwardRuleInput
  setFormData: React.Dispatch<React.SetStateAction<ServicePortForwardRuleInput>>
  submitting: boolean
  onSubmit: () => void
}

export function PortForwardRuleFormDialog({
  open,
  onOpenChange,
  editingRule,
  formData,
  setFormData,
  submitting,
  onSubmit,
}: PortForwardRuleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingRule ? "编辑端口转发" : "添加端口转发"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>协议</Label>
            <Select
              value={formData.protocol || "tcp"}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, protocol: v }))}
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
              <Label>监听端口</Label>
              <Input
                placeholder="宿主机端口，如 8080"
                value={formData.listen_port ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, listen_port: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>目标端口</Label>
              <Input
                placeholder="实例端口，如 80"
                value={formData.connect_port ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, connect_port: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>描述</Label>
            <Input
              placeholder="规则描述（可选）"
              value={formData.description ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.enabled ?? true}
              onCheckedChange={(v) => setFormData((prev) => ({ ...prev, enabled: v }))}
            />
            <Label>启用</Label>
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

interface PortForwardDeleteDialogProps {
  rule: ServicePortForwardRuleItem | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  deleting: boolean
}

export function PortForwardDeleteDialog({
  rule,
  onOpenChange,
  onConfirm,
  deleting,
}: PortForwardDeleteDialogProps) {
  return (
    <AlertDialog open={rule !== null} onOpenChange={(open) => { if (!open) onOpenChange(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除端口转发规则</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除这条端口转发规则吗？删除后将自动同步到节点。
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
