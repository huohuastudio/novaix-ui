"use no memo";
import { useBreadcrumb } from "@/hooks/use-breadcrumb"
import { HelpLink } from "@/components/help-doc"
import { useAdminPath } from "@/hooks/use-site-settings"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  getAdminVpcsById,
  postAdminVpcsByIdSubnets,
  deleteAdminVpcsByIdSubnetsBySubnetId,
  postAdminVpcsByIdAttach,
  deleteAdminVpcsByIdAttachmentsByAttachmentId,
  postAdminVpcsByIdSecurityGroups,
  deleteAdminVpcsByIdSecurityGroupsBySgId,
  getAdminVpcsByIdSecurityGroupsBySgIdRules,
  postAdminVpcsByIdSecurityGroupsBySgIdRules,
  deleteAdminVpcsByIdSecurityGroupsBySgIdRulesByRuleId,
} from "@/api"
import { useConfirm } from "@/hooks/use-confirm"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

const statusMap: Record<string, { label: string; variant: "default" | "outline" | "destructive" }> = {
  active: { label: "正常", variant: "default" },
  creating: { label: "创建中", variant: "outline" },
  error: { label: "异常", variant: "destructive" },
}

interface VPCData {
  id: number; name: string; cidr: string; status: string
  node_group_name: string; description: string; created_at: string
  subnet_count: number; instance_count: number
}
interface SubnetData {
  id: number; name: string; cidr: string; gateway: string
  dns1: string; dns2: string; used_ips: number; created_at: string
}
interface AttachData {
  id: number; subnet_id: number; instance_id: number
  instance_name: string; private_ip: string; device_name: string; created_at: string
}
interface SGData {
  id: number; name: string; description: string; rule_count: number; created_at: string
}
interface RuleData {
  id: number; direction: string; action: string; protocol: string
  source: string; destination: string; port_range: string; description: string
}

export default function VPCDetailPage() {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)

  const [vpc, setVpc] = useState<VPCData | null>(null)
  const [subnets, setSubnets] = useState<SubnetData[]>([])
  const [attachments, setAttachments] = useState<AttachData[]>([])
  const [securityGroups, setSGs] = useState<SGData[]>([])
  const [loading, setLoading] = useState(true)

  const adminPath = useAdminPath()

  useBreadcrumb([
    { label: "私有网络", href: `${adminPath}/vpcs` },
    { label: vpc?.name ?? "加载中..." },
  ])

  const fetchData = useCallback(async () => {
    try {
      const { data: res } = await getAdminVpcsById({ path: { id } })
      const d = res?.data as Record<string, unknown> | undefined
      if (d) {
        setVpc(d as unknown as VPCData)
        setSubnets((d as Record<string, unknown>).subnets as SubnetData[] ?? [])
        setAttachments((d as Record<string, unknown>).attachments as AttachData[] ?? [])
        setSGs((d as Record<string, unknown>).security_groups as SGData[] ?? [])
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [id])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
  useEffect(() => { fetchData() }, [fetchData])

  const { confirm, ConfirmDialog } = useConfirm()

  // ── 子网 ──
  const [subnetOpen, setSubnetOpen] = useState(false)
  const subnetForm = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "请输入名称").max(128),
      cidr: z.string().min(1, "请输入 CIDR"),
    })),
    defaultValues: { name: "", cidr: "" },
  })

  const handleCreateSubnet = async (values: { name: string; cidr: string }) => {
    try {
      const { data: res } = await postAdminVpcsByIdSubnets({ path: { id }, body: values })
      if (res?.code !== 0) { toast.error(res?.message ?? "创建子网失败"); return }
      toast.success("子网已创建")
      setSubnetOpen(false)
      subnetForm.reset()
      fetchData()
    } catch (err) { toast.error(getErrorMessage(err, "创建子网失败")) }
  }

  const handleDeleteSubnet = async (subnetId: number) => {
    const ok = await confirm({ title: "确认删除", description: "确定要删除该子网吗？", destructive: true })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminVpcsByIdSubnetsBySubnetId({ path: { id, subnetId } })
      if (res?.code !== 0) { toast.error(res?.message ?? "删除子网失败"); return }
      toast.success("子网已删除")
      fetchData()
    } catch (err) { toast.error(getErrorMessage(err, "删除子网失败")) }
  }

  // ── 挂载 ──
  const [attachOpen, setAttachOpen] = useState(false)
  const attachForm = useForm({
    resolver: zodResolver(z.object({
      subnet_id: z.coerce.number().min(1, "请选择子网"),
      instance_id: z.coerce.number().min(1, "请输入实例 ID"),
      private_ip: z.string().default(""),
    })),
    defaultValues: { subnet_id: 0, instance_id: 0, private_ip: "" },
  })

  const handleAttach = async (values: { subnet_id: number; instance_id: number; private_ip: string }) => {
    try {
      const { data: res } = await postAdminVpcsByIdAttach({ path: { id }, body: values })
      if (res?.code !== 0) { toast.error(res?.message ?? "挂载失败"); return }
      toast.success("实例已挂载")
      setAttachOpen(false)
      attachForm.reset()
      fetchData()
    } catch (err) { toast.error(getErrorMessage(err, "挂载失败")) }
  }

  const handleDetach = async (attachmentId: number) => {
    const ok = await confirm({ title: "确认卸载", description: "确定要将该实例从 VPC 卸载吗？", destructive: true })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminVpcsByIdAttachmentsByAttachmentId({ path: { id, attachmentId } })
      if (res?.code !== 0) { toast.error(res?.message ?? "卸载失败"); return }
      toast.success("实例已卸载")
      fetchData()
    } catch (err) { toast.error(getErrorMessage(err, "卸载失败")) }
  }

  // ── 安全组 ──
  const [sgOpen, setSgOpen] = useState(false)
  const sgForm = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "请输入名称").max(128),
      description: z.string().max(512).default(""),
    })),
    defaultValues: { name: "", description: "" },
  })

  const handleCreateSG = async (values: { name: string; description: string }) => {
    try {
      const { data: res } = await postAdminVpcsByIdSecurityGroups({ path: { id }, body: values })
      if (res?.code !== 0) { toast.error(res?.message ?? "创建安全组失败"); return }
      toast.success("安全组已创建")
      setSgOpen(false)
      sgForm.reset()
      fetchData()
    } catch (err) { toast.error(getErrorMessage(err, "创建安全组失败")) }
  }

  const handleDeleteSG = async (sgId: number) => {
    const ok = await confirm({ title: "确认删除", description: "确定要删除该安全组及其所有规则吗？", destructive: true })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminVpcsByIdSecurityGroupsBySgId({ path: { id, sgId } })
      if (res?.code !== 0) { toast.error(res?.message ?? "删除安全组失败"); return }
      toast.success("安全组已删除")
      fetchData()
    } catch (err) { toast.error(getErrorMessage(err, "删除安全组失败")) }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (!vpc) return <div className="p-6 text-muted-foreground">VPC 不存在</div>

  const st = statusMap[vpc.status] ?? statusMap.active

  return (
    <div className="p-6 space-y-1">
      {ConfirmDialog}

      {/* 基本信息 */}
      <h3 className="text-lg font-semibold">{vpc.name}</h3>
      <p className="text-sm text-muted-foreground">{vpc.description || "无描述"}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div>
          <p className="text-xs text-muted-foreground">网段</p>
          <p className="font-mono text-sm">{vpc.cidr}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">状态</p>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">节点组</p>
          <p className="text-sm">{vpc.node_group_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">创建时间</p>
          <p className="text-sm">{vpc.created_at}</p>
        </div>
      </div>

      <Separator className="my-8" />

      {/* 子网管理 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-semibold">子网管理</h3>
            <HelpLink path="/novaix/vpc" />
          </div>
          <p className="text-sm text-muted-foreground">管理 VPC 中的子网</p>
        </div>
        <Button onClick={() => setSubnetOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />创建子网
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>网段</TableHead>
            <TableHead>网关</TableHead>
            <TableHead>DNS</TableHead>
            <TableHead>已用 IP</TableHead>
            <TableHead className="w-16">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subnets.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无子网</TableCell></TableRow>
          ) : subnets.map(s => (
            <TableRow key={s.id}>
              <TableCell>{s.name}</TableCell>
              <TableCell className="font-mono text-sm">{s.cidr}</TableCell>
              <TableCell className="font-mono text-sm">{s.gateway}</TableCell>
              <TableCell className="text-sm">{s.dns1}, {s.dns2}</TableCell>
              <TableCell>{s.used_ips}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteSubnet(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={subnetOpen} onOpenChange={setSubnetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>创建子网</DialogTitle></DialogHeader>
          <Form {...subnetForm}>
            <form onSubmit={subnetForm.handleSubmit(handleCreateSubnet)} className="space-y-4">
              <FormField control={subnetForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>名称</FormLabel><FormControl><Input placeholder="subnet-1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={subnetForm.control} name="cidr" render={({ field }) => (
                <FormItem><FormLabel>子网网段</FormLabel><FormControl><Input placeholder="10.0.1.0/24" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter><Button type="submit">创建</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Separator className="my-8" />

      {/* 挂载实例 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">挂载实例</h3>
          <p className="text-sm text-muted-foreground">将实例连接到 VPC 子网</p>
        </div>
        <Button onClick={() => setAttachOpen(true)} disabled={subnets.length === 0}>
          <Plus className="mr-1 h-4 w-4" />挂载实例
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>实例名称</TableHead>
            <TableHead>子网</TableHead>
            <TableHead>私有 IP</TableHead>
            <TableHead>设备名</TableHead>
            <TableHead>挂载时间</TableHead>
            <TableHead className="w-16">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attachments.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无挂载实例</TableCell></TableRow>
          ) : attachments.map(a => {
            const subnet = subnets.find(s => s.id === a.subnet_id)
            return (
              <TableRow key={a.id}>
                <TableCell>{a.instance_name}</TableCell>
                <TableCell>{subnet?.name ?? a.subnet_id}</TableCell>
                <TableCell className="font-mono text-sm">{a.private_ip}</TableCell>
                <TableCell className="font-mono text-sm">{a.device_name}</TableCell>
                <TableCell className="text-sm">{a.created_at}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDetach(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>挂载实例</DialogTitle></DialogHeader>
          <Form {...attachForm}>
            <form onSubmit={attachForm.handleSubmit(handleAttach)} className="space-y-4">
              <FormField control={attachForm.control} name="subnet_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>子网</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="选择子网" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {subnets.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.cidr})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={attachForm.control} name="instance_id" render={({ field }) => (
                <FormItem><FormLabel>实例 ID</FormLabel><FormControl><Input type="number" placeholder="输入实例 ID" value={String(field.value || "")} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={attachForm.control} name="private_ip" render={({ field }) => (
                <FormItem><FormLabel>私有 IP（留空自动分配）</FormLabel><FormControl><Input placeholder="10.0.1.2" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter><Button type="submit">挂载</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Separator className="my-8" />

      {/* 安全组 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-semibold">安全组</h3>
            <HelpLink path="/novaix/vpc" />
          </div>
          <p className="text-sm text-muted-foreground">管理 VPC 网络访问控制策略</p>
        </div>
        <Button onClick={() => setSgOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />创建安全组
        </Button>
      </div>

      {securityGroups.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">暂无安全组</p>
      ) : securityGroups.map(sg => (
        <SecurityGroupCard
          key={sg.id}
          vpcId={id}
          sg={sg}
          onDelete={() => handleDeleteSG(sg.id)}
          onRefresh={fetchData}
          confirm={confirm}
        />
      ))}

      <Dialog open={sgOpen} onOpenChange={setSgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>创建安全组</DialogTitle></DialogHeader>
          <Form {...sgForm}>
            <form onSubmit={sgForm.handleSubmit(handleCreateSG)} className="space-y-4">
              <FormField control={sgForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>名称</FormLabel><FormControl><Input placeholder="web-servers" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={sgForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>描述</FormLabel><FormControl><Input placeholder="可选描述" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter><Button type="submit">创建</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── 安全组卡片（可展开查看规则） ──

function SecurityGroupCard({ vpcId, sg, onDelete, onRefresh, confirm }: {
  vpcId: number; sg: SGData; onDelete: () => void; onRefresh: () => void
  confirm: (opts: { title: string; description: string; destructive?: boolean }) => Promise<boolean>
}) {
  const [expanded, setExpanded] = useState(false)
  const [rules, setRules] = useState<RuleData[]>([])
  const [rulesLoaded, setRulesLoaded] = useState(false)
  const [ruleOpen, setRuleOpen] = useState(false)

  const loadRules = async (force = false) => {
    if (rulesLoaded && !force) return
    try {
      const { data: res } = await getAdminVpcsByIdSecurityGroupsBySgIdRules({ path: { id: vpcId, sgId: sg.id } })
      setRules((res?.data as RuleData[] | undefined) ?? [])
      setRulesLoaded(true)
    } catch { /* ignore */ }
  }

  const toggleExpand = () => {
    if (!expanded) loadRules()
    setExpanded(!expanded)
  }

  const ruleForm = useForm({
    resolver: zodResolver(z.object({
      direction: z.enum(["ingress", "egress"]),
      action: z.enum(["allow", "drop", "reject"]),
      protocol: z.string().default(""),
      source: z.string().max(128).default(""),
      destination: z.string().max(128).default(""),
      port_range: z.string().max(64).default(""),
      description: z.string().max(256).default(""),
    })),
    defaultValues: { direction: "ingress" as const, action: "allow" as const, protocol: "", source: "", destination: "", port_range: "", description: "" },
  })

  const handleCreateRule = async (values: { direction: string; action: string; protocol: string; source: string; destination: string; port_range: string; description: string }) => {
    try {
      const { data: res } = await postAdminVpcsByIdSecurityGroupsBySgIdRules({ path: { id: vpcId, sgId: sg.id }, body: values })
      if (res?.code !== 0) { toast.error(res?.message ?? "创建规则失败"); return }
      toast.success("规则已创建")
      setRuleOpen(false)
      ruleForm.reset()
      loadRules(true)
      onRefresh()
    } catch (err) { toast.error(getErrorMessage(err, "创建规则失败")) }
  }

  const handleDeleteRule = async (ruleId: number) => {
    const ok = await confirm({ title: "确认删除", description: "确定要删除该规则吗？", destructive: true })
    if (!ok) return
    try {
      const { data: res } = await deleteAdminVpcsByIdSecurityGroupsBySgIdRulesByRuleId({ path: { id: vpcId, sgId: sg.id, ruleId } })
      if (res?.code !== 0) { toast.error(res?.message ?? "删除规则失败"); return }
      toast.success("规则已删除")
      loadRules(true)
      onRefresh()
    } catch (err) { toast.error(getErrorMessage(err, "删除规则失败")) }
  }

  return (
    <div className="rounded-md border mt-3">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{sg.name}</span>
          <span className="text-sm text-muted-foreground">{sg.description}</span>
          <Badge variant="outline">{sg.rule_count} 条规则</Badge>
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" onClick={() => setRuleOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />添加规则
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3">
          {rules.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">暂无规则</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>方向</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>协议</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>端口</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-16">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.direction === "ingress" ? "入站" : "出站"}</Badge></TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell>{r.protocol || "全部"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.source || "*"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.destination || "*"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.port_range || "全部"}</TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加规则</DialogTitle></DialogHeader>
          <Form {...ruleForm}>
            <form onSubmit={ruleForm.handleSubmit(handleCreateRule)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={ruleForm.control} name="direction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>方向</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ingress">入站</SelectItem>
                        <SelectItem value="egress">出站</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={ruleForm.control} name="action" render={({ field }) => (
                  <FormItem>
                    <FormLabel>动作</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="allow">允许</SelectItem>
                        <SelectItem value="drop">丢弃</SelectItem>
                        <SelectItem value="reject">拒绝</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={ruleForm.control} name="protocol" render={({ field }) => (
                <FormItem>
                  <FormLabel>协议（留空表示全部）</FormLabel>
                  <Select onValueChange={v => { const val = v === "all" ? "" : v; field.onChange(val); if (val !== "tcp" && val !== "udp") ruleForm.setValue("port_range", "") }} value={field.value || "all"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="全部" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="icmp4">ICMPv4</SelectItem>
                      <SelectItem value="icmp6">ICMPv6</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={ruleForm.control} name="source" render={({ field }) => (
                  <FormItem><FormLabel>来源</FormLabel><FormControl><Input placeholder="0.0.0.0/0" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={ruleForm.control} name="destination" render={({ field }) => (
                  <FormItem><FormLabel>目标</FormLabel><FormControl><Input placeholder="0.0.0.0/0" {...field} /></FormControl></FormItem>
                )} />
              </div>
              {(ruleForm.watch("protocol") === "tcp" || ruleForm.watch("protocol") === "udp") && (
                <FormField control={ruleForm.control} name="port_range" render={({ field }) => (
                  <FormItem><FormLabel>端口范围</FormLabel><FormControl><Input placeholder="80,443" {...field} /></FormControl></FormItem>
                )} />
              )}
              <FormField control={ruleForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>描述</FormLabel><FormControl><Input placeholder="可选" {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter><Button type="submit">添加</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
