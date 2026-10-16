import type { ServiceFirewallSyncStatus } from "@/api"
import { isTaskActive } from "@/lib/task-constants"

export function FirewallSyncStatus({ sync }: { sync?: ServiceFirewallSyncStatus }) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground mb-4">
      <p>未启用入站规则时，本系统不限制入站流量；启用后，未匹配的入站流量将被拒绝。节点上的其他网络策略仍可能影响连接。</p>
      {sync?.status === "failed" && <p role="alert" className="text-destructive">防火墙同步失败，当前规则可能尚未生效。{sync.message || "请检查配置后重新保存规则。"}</p>}
      {isTaskActive(sync?.status) && <p role="status">防火墙规则正在同步，请等待完成后确认连接。</p>}
    </div>
  )
}
