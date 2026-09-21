import { Address4, Address6 } from "ip-address"

// 按前缀计算网络地址，兼容压缩 IPv6 和非整段前缀。
export function parsePoolNetwork(address: string, type: "ipv4" | "ipv6") {
  if (!address.includes("/") || address.includes("%")) return null
  try {
    const parsed = type === "ipv6" ? new Address6(address) : new Address4(address)
    return {
      gateway: parsed.correctForm(),
      cidr: `${parsed.startAddress().correctForm()}/${parsed.subnetMask}`,
    }
  } catch {
    return null
  }
}
