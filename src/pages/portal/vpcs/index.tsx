import { useEffect, useState, useCallback } from "react"
import {
  Network,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Link as LinkIcon,
  Unlink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getPortalVpcs,
  getPortalVpcsById,
  postPortalVpcs,
  deletePortalVpcsById,
  postPortalVpcsByIdSubnets,
  deletePortalVpcsByIdSubnetsBySubnetId,
  postPortalVpcsByIdAttach,
  deletePortalVpcsByIdAttachmentsByAttachmentId,
  getPortalVpcNodeGroups,
} from "@/api"
import type {
  PortalPortalVpcItem,
  PortalPortalSubnetItem,
  PortalPortalAttachmentItem,
} from "@/api"
import { SimplePagination } from "@/components/simple-pagination"
import { useConfirm } from "@/hooks/use-confirm"
import { useSiteName } from "@/hooks/use-site-settings"
import { getErrorMessage } from "@/lib/utils"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// VPC 详情（展开后的数据）
interface VpcDetail {
  subnets: PortalPortalSubnetItem[]
  attachments: PortalPortalAttachmentItem[]
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "运行中", variant: "default" },
  creating: { label: "创建中", variant: "secondary" },
  error: { label: "异常", variant: "destructive" },
}

function VpcStatus({ status }: { status: string }) {
  const cfg = statusMap[status] ?? { label: status, variant: "outline" }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export default function PortalVpcs() {
  const siteName = useSiteName()
  useDocumentTitle(`私有网络 - ${siteName}`)

  const [vpcs, setVpcs] = useState<PortalPortalVpcItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)

  // 展开状态
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailMap, setDetailMap] = useState<Record<number, VpcDetail>>({})

  // 可用节点组
  const [nodeGroups, setNodeGroups] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    getPortalVpcNodeGroups().then(({ data: res }) => {
      setNodeGroups((res?.data as { id: number; name: string }[] | undefined) ?? [])
    })
  }, [])

  // 创建 VPC 对话框
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    node_group_id: "",
    cidr: "10.0.0.0/16",
    description: "",
  })

  // 创建子网对话框
  const [subnetOpen, setSubnetOpen] = useState(false)
  const [subnetCreating, setSubnetCreating] = useState(false)
  const [subnetVpcId, setSubnetVpcId] = useState<number>(0)
  const [subnetForm, setSubnetForm] = useState({ name: "", cidr: "" })

  // 挂载实例对话框
  const [attachOpen, setAttachOpen] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [attachVpcId, setAttachVpcId] = useState<number>(0)
  const [attachForm, setAttachForm] = useState({ subnet_id: "", instance_id: "" })
  const [attachSubnets, setAttachSubnets] = useState<PortalPortalSubnetItem[]>([])

  const { confirm, ConfirmDialog } = useConfirm()

  const fetchVpcs = useCallback(async (p: number) => {
    try {
      const { data: res } = await getPortalVpcs({
        query: { page: p, page_size: pageSize },
      })
      setVpcs(res?.data?.items ?? [])
      setTotal(res?.data?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVpcs(page)
  }, [fetchVpcs, page])

  // 展开/收起 VPC 详情
  const toggleExpand = async (vpcId: number) => {
    if (expandedId === vpcId) {
      setExpandedId(null)
      return
    }
    setExpandedId(vpcId)
    await fetchDetail(vpcId)
  }

  const fetchDetail = async (vpcId: number): Promise<VpcDetail | null> => {
    setDetailLoading(true)
    try {
      const { data: res } = await getPortalVpcsById({ path: { id: vpcId } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = (res as any)?.data
      const detail: VpcDetail = {
        subnets: d?.subnets ?? [],
        attachments: d?.attachments ?? [],
      }
      setDetailMap((prev) => ({ ...prev, [vpcId]: detail }))
      return detail
    } catch (err) {
      toast.error(getErrorMessage(err, "获取详情失败"))
      return null
    } finally {
      setDetailLoading(false)
    }
  }

  // 创建 VPC
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error("请输入名称")
      return
    }
    if (!createForm.node_group_id) {
      toast.error("请输入节点组 ID")
      return
    }
    if (!createForm.cidr.trim()) {
      toast.error("请输入 CIDR")
      return
    }
    setCreating(true)
    try {
      const { data: res } = await postPortalVpcs({
        body: {
          name: createForm.name,
          node_group_id: Number(createForm.node_group_id),
          cidr: createForm.cidr,
          description: createForm.description || undefined,
        },
      })
      if (res?.code !== 0) { toast.error(res?.message ?? "创建失败"); return }
      toast.success("私有网络已创建")
      setCreateOpen(false)
      setCreateForm({ name: "", node_group_id: "", cidr: "10.0.0.0/16", description: "" })
      fetchVpcs(page)
    } catch (err) {
      toast.error(getErrorMessage(err, "创建失败"))
    } finally {
      setCreating(false)
    }
  }

  // 删除 VPC
  const handleDeleteVpc = async (vpc: PortalPortalVpcItem) => {
    const ok = await confirm({
      title: "删除私有网络",
      description: (
        <span>
          确定要删除私有网络 <strong>{vpc.name}</strong> 吗？删除前需先移除所有子网。
        </span>
      ),
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deletePortalVpcsById({ path: { id: vpc.id! } })
      if (res?.code !== 0) { toast.error(res?.message ?? "删除失败"); return }
      toast.success("已删除")
      if (expandedId === vpc.id) setExpandedId(null)
      fetchVpcs(page)
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"))
    }
  }

  // 创建子网
  const openSubnetDialog = (vpcId: number) => {
    setSubnetVpcId(vpcId)
    setSubnetForm({ name: "", cidr: "" })
    setSubnetOpen(true)
  }

  const handleCreateSubnet = async () => {
    if (!subnetForm.name.trim() || !subnetForm.cidr.trim()) {
      toast.error("请填写子网名称和 CIDR")
      return
    }
    setSubnetCreating(true)
    try {
      const { data: res } = await postPortalVpcsByIdSubnets({
        path: { id: subnetVpcId },
        body: { name: subnetForm.name, cidr: subnetForm.cidr },
      })
      if (res?.code !== 0) { toast.error(res?.message ?? "创建子网失败"); return }
      toast.success("子网已创建")
      setSubnetOpen(false)
      await fetchDetail(subnetVpcId)
      fetchVpcs(page)
    } catch (err) {
      toast.error(getErrorMessage(err, "创建子网失败"))
    } finally {
      setSubnetCreating(false)
    }
  }

  // 删除子网
  const handleDeleteSubnet = async (vpcId: number, subnetId: number, name: string) => {
    const ok = await confirm({
      title: "删除子网",
      description: (
        <span>
          确定要删除子网 <strong>{name}</strong> 吗？
        </span>
      ),
      confirmText: "删除",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deletePortalVpcsByIdSubnetsBySubnetId({
        path: { id: vpcId, subnetId },
      })
      if (res?.code !== 0) { toast.error(res?.message ?? "删除子网失败"); return }
      toast.success("子网已删除")
      await fetchDetail(vpcId)
      fetchVpcs(page)
    } catch (err) {
      toast.error(getErrorMessage(err, "删除子网失败"))
    }
  }

  // 挂载实例
  const openAttachDialog = async (vpcId: number) => {
    setAttachVpcId(vpcId)
    setAttachForm({ subnet_id: "", instance_id: "" })
    let subnets: typeof detailMap[number]["subnets"] | undefined = detailMap[vpcId]?.subnets
    if (!subnets) {
      const detail = await fetchDetail(vpcId)
      subnets = detail?.subnets
    }
    setAttachSubnets(subnets ?? [])
    setAttachOpen(true)
  }

  const handleAttach = async () => {
    if (!attachForm.subnet_id || !attachForm.instance_id) {
      toast.error("请选择子网和实例")
      return
    }
    setAttaching(true)
    try {
      const { data: res } = await postPortalVpcsByIdAttach({
        path: { id: attachVpcId },
        body: {
          subnet_id: Number(attachForm.subnet_id),
          instance_id: Number(attachForm.instance_id),
        },
      })
      if (res?.code !== 0) { toast.error(res?.message ?? "挂载失败"); return }
      toast.success("实例已挂载")
      setAttachOpen(false)
      await fetchDetail(attachVpcId)
      fetchVpcs(page)
    } catch (err) {
      toast.error(getErrorMessage(err, "挂载失败"))
    } finally {
      setAttaching(false)
    }
  }

  // 卸载实例
  const handleDetach = async (vpcId: number, attachmentId: number, instanceName: string) => {
    const ok = await confirm({
      title: "卸载实例",
      description: (
        <span>
          确定要从私有网络中卸载实例 <strong>{instanceName}</strong> 吗？
        </span>
      ),
      confirmText: "卸载",
      destructive: true,
    })
    if (!ok) return
    try {
      const { data: res } = await deletePortalVpcsByIdAttachmentsByAttachmentId({
        path: { id: vpcId, attachmentId },
      })
      if (res?.code !== 0) { toast.error(res?.message ?? "卸载失败"); return }
      toast.success("已卸载")
      await fetchDetail(vpcId)
      fetchVpcs(page)
    } catch (err) {
      toast.error(getErrorMessage(err, "卸载失败"))
    }
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">私有网络</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            创建和管理私有网络，实现实例间的安全内网通信
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          创建私有网络
        </Button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
          ))}
        </div>
      ) : vpcs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Network className="size-10 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium">暂无私有网络</h3>
          <p className="text-sm text-muted-foreground mt-1">
            创建私有网络以实现实例间的安全内网通信
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {vpcs.map((vpc) => {
              const isExpanded = expandedId === vpc.id
              const detail = vpc.id != null ? detailMap[vpc.id] : undefined

              return (
                <div key={vpc.id} className="rounded-md border">
                  {/* VPC 概要行 */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => vpc.id != null && toggleExpand(vpc.id)}
                  >
                    <span className="text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{vpc.name}</span>
                        <VpcStatus status={vpc.status ?? "active"} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{vpc.cidr}</span>
                        {vpc.node_group_name && <span>节点组: {vpc.node_group_name}</span>}
                        <span>{vpc.subnet_count ?? 0} 个子网</span>
                        <span>{vpc.instance_count ?? 0} 个实例</span>
                      </div>
                      {vpc.description && (
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                          {vpc.description}
                        </p>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => vpc.id != null && openSubnetDialog(vpc.id)}
                      >
                        <Plus className="size-3.5" />
                        子网
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => vpc.id != null && openAttachDialog(vpc.id)}
                      >
                        <LinkIcon className="size-3.5" />
                        挂载
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDeleteVpc(vpc)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
                      {detailLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-64" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      ) : (
                        <>
                          {/* 子网列表 */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">子网</h4>
                            {!detail?.subnets?.length ? (
                              <p className="text-xs text-muted-foreground">暂无子网</p>
                            ) : (
                              <div className="space-y-1.5">
                                {detail.subnets.map((subnet) => (
                                  <div
                                    key={subnet.id}
                                    className="flex items-center justify-between rounded bg-background px-3 py-2 text-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium">{subnet.name}</span>
                                      <span className="font-mono text-xs text-muted-foreground">
                                        {subnet.cidr}
                                      </span>
                                      {subnet.gateway && (
                                        <span className="text-xs text-muted-foreground">
                                          网关: {subnet.gateway}
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        已分配 {subnet.used_ips ?? 0} 个 IP
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      className="h-6 px-1.5 text-destructive hover:text-destructive"
                                      onClick={() =>
                                        vpc.id != null &&
                                        subnet.id != null &&
                                        handleDeleteSubnet(vpc.id, subnet.id, subnet.name ?? "")
                                      }
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 已挂载实例 */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">已挂载实例</h4>
                            {!detail?.attachments?.length ? (
                              <p className="text-xs text-muted-foreground">暂无挂载实例</p>
                            ) : (
                              <div className="space-y-1.5">
                                {detail.attachments.map((att) => (
                                  <div
                                    key={att.id}
                                    className="flex items-center justify-between rounded bg-background px-3 py-2 text-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium">
                                        {att.instance_name ?? `实例 #${att.instance_id}`}
                                      </span>
                                      {att.private_ip && (
                                        <span className="font-mono text-xs text-muted-foreground">
                                          {att.private_ip}
                                        </span>
                                      )}
                                      {att.device_name && (
                                        <span className="text-xs text-muted-foreground">
                                          设备: {att.device_name}
                                        </span>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      className="h-6 px-1.5 text-destructive hover:text-destructive"
                                      onClick={() =>
                                        vpc.id != null &&
                                        att.id != null &&
                                        handleDetach(
                                          vpc.id,
                                          att.id,
                                          att.instance_name ?? `实例 #${att.instance_id}`
                                        )
                                      }
                                    >
                                      <Unlink className="size-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </>
      )}

      {/* 创建私有网络对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建私有网络</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                placeholder="如：生产网络"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>区域</Label>
              <Select
                value={createForm.node_group_id}
                onValueChange={(v) => setCreateForm({ ...createForm, node_group_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择区域" />
                </SelectTrigger>
                <SelectContent>
                  {nodeGroups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CIDR</Label>
              <Input
                placeholder="如：10.0.0.0/16"
                value={createForm.cidr}
                onChange={(e) => setCreateForm({ ...createForm, cidr: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">私有网络的地址范围，如 10.0.0.0/16</p>
            </div>
            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea
                placeholder="用途描述"
                rows={2}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="size-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建子网对话框 */}
      <Dialog open={subnetOpen} onOpenChange={setSubnetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建子网</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                placeholder="如：应用子网"
                value={subnetForm.name}
                onChange={(e) => setSubnetForm({ ...subnetForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CIDR</Label>
              <Input
                placeholder="如：10.0.1.0/24"
                value={subnetForm.cidr}
                onChange={(e) => setSubnetForm({ ...subnetForm, cidr: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                子网地址范围，必须在私有网络 CIDR 范围内
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubnetOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateSubnet} disabled={subnetCreating}>
              {subnetCreating && <Loader2 className="size-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 挂载实例对话框 */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>挂载实例</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>子网</Label>
              <Select
                value={attachForm.subnet_id}
                onValueChange={(v) => setAttachForm({ ...attachForm, subnet_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择子网" />
                </SelectTrigger>
                <SelectContent className="shadow-sm ring-0">
                  {attachSubnets.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.cidr})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attachSubnets.length === 0 && (
                <p className="text-xs text-destructive">该私有网络尚无子网，请先创建子网</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>实例 ID</Label>
              <Input
                type="number"
                placeholder="输入要挂载的实例 ID"
                value={attachForm.instance_id}
                onChange={(e) => setAttachForm({ ...attachForm, instance_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">仅支持挂载同区域（节点组）的实例</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAttach}
              disabled={attaching || !attachForm.subnet_id || !attachForm.instance_id}
            >
              {attaching && <Loader2 className="size-4 animate-spin" />}
              挂载
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  )
}
