import type { ServiceNatAllocationInfo } from "@/api"

export interface NATPortRange {
  portStart: number
  portEnd: number
  mode: string
  sshPort: number
  portQuota: number
  portUsed: number
}

export function toNATPortRange(info?: ServiceNatAllocationInfo): NATPortRange | undefined {
  if (info?.port_start == null || info?.port_end == null) return undefined
  return {
    portStart: info.port_start,
    portEnd: info.port_end,
    mode: info.mode || "block",
    sshPort: info.ssh_port ?? info.port_start,
    portQuota: info.port_quota ?? 0,
    portUsed: info.port_used ?? 0,
  }
}
