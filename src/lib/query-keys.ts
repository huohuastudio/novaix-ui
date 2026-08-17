// 聚合/非 SDK 接口的手工 queryKey 统一注册处。
// 单接口读取一律使用 @/api/@tanstack/react-query.gen 生成的 xxxQueryKey()
// （接口的 query 参数直接传入生成函数，而非手工追加判别符），
// 只有聚合多接口或走通配 proxy（无生成 SDK）的查询才允许手工构造 key，且必须集中登记在此。
export const queryKeys = {
  /** 节点镜像列表（走 lib/incus.ts 通配 proxy，无生成 SDK） */
  nodeImages: (nodeId: number) => ["node-images", nodeId] as const,
  /** 新手引导的节点/镜像/套餐/支付四项聚合检查 */
  setupGuideStatus: () => ["setup-guide-status"] as const,
  /** 防火墙规则（scope 为注入 api 的端标识，区分 admin/portal 两端缓存） */
  firewallRules: (scope: "admin" | "portal", instanceId: number) => ["firewall-rules", scope, instanceId] as const,
  /** 端口转发规则（同上） */
  portForwardRules: (scope: "admin" | "portal", instanceId: number) => ["port-forward-rules", scope, instanceId] as const,
  /** 工单员工列表（管理员+客服两角色的全量分页聚合，代价较高；用独立根 key，避免被无关的用户 CRUD 失效连带 refetch） */
  ticketStaff: () => ["ticket-staff"] as const,
  /** 节点网络列表（走 lib/incus.ts 通配 proxy，无生成 SDK） */
  nodeNetworks: (nodeId: number) => ["node-networks", nodeId] as const,
  /** 单个网络的运行状态 + DHCP 租约聚合（走通配 proxy；managed 决定是否取租约，需进 key） */
  nodeNetworkState: (nodeId: number, networkName: string, managed: boolean) =>
    ["node-network-state", nodeId, networkName, managed] as const,
  /** 节点存储池列表（走 lib/incus.ts 通配 proxy，无生成 SDK） */
  nodeStoragePools: (nodeId: number) => ["node-storage-pools", nodeId] as const,
  /** 单个存储池的卷列表 + 容量用量聚合（走通配 proxy） */
  nodeStoragePoolDetail: (nodeId: number, poolName: string) => ["node-storage-pool-detail", nodeId, poolName] as const,
  /** 节点配置文件列表（走 lib/incus.ts 通配 proxy，无生成 SDK；nodeId 为空时查询禁用） */
  nodeProfiles: (nodeId: number | undefined) => ["node-profiles", nodeId] as const,
  /** 节点资源聚合（存储池/网络/配置模板三个 proxy 调用，供创建/编辑表单选项使用） */
  nodeResources: (nodeId: number | undefined) => ["node-resources", nodeId] as const,
  /** 节点硬件概况（CPU/内存，走 1.0/resources proxy，概览页兜底使用） */
  nodeHardware: (nodeId: number) => ["node-hardware", nodeId] as const,
  /** 节点存储池容量用量聚合（概览页使用） */
  nodeStoragePoolUsage: (nodeId: number) => ["node-storage-pool-usage", nodeId] as const,
}
