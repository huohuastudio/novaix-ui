import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { PortalPortalInstanceItem } from "@/api"
import { getPortalInstancesByIdPassword } from "@/api"
import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Terminal } from "lucide-react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

export function AccessPanel({ instance }: { instance: PortalPortalInstanceItem }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState<string | null>(null)
  const [loadingPassword, setLoadingPassword] = useState(false)

  const isRunning = instance.status === "running"
  const instanceBusy = instance.active_task_id != null
  const nat = instance.nat_info
  const defaultUser = instance.default_user || "root"
  const ip = nat ? `${nat.shared_ip_address}:${nat.ssh_port}` : instance.ip_address || ""
  const sshCommand = nat
    ? `ssh -p ${nat.ssh_port} ${defaultUser}@${nat.shared_ip_address}`
    : (instance.ip_address ? `ssh ${defaultUser}@${instance.ip_address}` : "")

  const togglePassword = async () => {
    if (password !== null) {
      setPassword(null)
      return
    }
    setLoadingPassword(true)
    try {
      const { data: res } = await getPortalInstancesByIdPassword({ path: { id: instance.id ?? 0 } })
      if (res?.code === 0 && res.data?.password) {
        setPassword(res.data.password)
      } else {
        toast.error("暂无密码记录")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "获取密码失败"))
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <section>
      <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">连接信息</h2>
      <div className="rounded-2xl bg-background divide-y divide-border/50">
        {/* IP / 连接地址 */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-[13px] text-muted-foreground">{nat ? "连接地址" : "IP 地址"}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium font-mono">{ip || "-"}</span>
            {ip && <CopyButton value={ip} />}
          </div>
        </div>

        {/* 用户名 */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-[13px] text-muted-foreground">用户名</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium font-mono">{defaultUser}</span>
            <CopyButton value={defaultUser} />
          </div>
        </div>

        {/* 密码 */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-[13px] text-muted-foreground">密码</span>
          <div className="flex items-center gap-1.5">
            {password ? (
              <>
                <code className="text-[12px] font-mono bg-muted px-2 py-0.5 rounded select-all">{password}</code>
                <CopyButton value={password} />
              </>
            ) : (
              <span className="text-[13px] font-medium font-mono">••••••••</span>
            )}
            <button
              onClick={togglePassword}
              disabled={loadingPassword || instanceBusy}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              title={instanceBusy ? "任务进行中，完成后可查看" : undefined}
            >
              {password ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* SSH 命令 */}
        {sshCommand && (
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[13px] text-muted-foreground">SSH 命令</span>
            <div className="flex items-center gap-1.5">
              <code className="text-[12px] font-mono bg-muted px-2 py-0.5 rounded">{sshCommand}</code>
              <CopyButton value={sshCommand} />
            </div>
          </div>
        )}

        {/* NAT 端口范围 */}
        {nat && nat.port_start != null && nat.port_end != null && (
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[13px] text-muted-foreground">可用端口</span>
            <span className="text-[13px] font-medium font-mono">
              {nat.port_start + 1} - {nat.port_end}
            </span>
          </div>
        )}

        {/* 快捷操作 */}
        <div className="flex items-center gap-2 px-5 py-3.5">
          <Button
            size="sm"
            variant="outline"
            className="text-[12px] h-7"
            onClick={() => navigate(`/portal/servers/${instance.id}/terminal`)}
            disabled={!isRunning}
          >
            <Terminal className="size-3" />
            {isRunning ? "打开终端" : "终端（需运行中）"}
          </Button>
          {instance.ipv6_address && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-muted-foreground">IPv6</span>
              <span className="text-[11px] font-mono text-muted-foreground">{instance.ipv6_address}</span>
              <CopyButton value={instance.ipv6_address} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
