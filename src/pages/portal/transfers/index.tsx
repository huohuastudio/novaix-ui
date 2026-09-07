import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { ArrowLeftRight, Loader2, Send, Download as ReceiveIcon } from 'lucide-react'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'

import {
  getPortalPushTransfers,
  postPortalPushTransfers,
  postPortalPushTransfersByIdCancel,
  getPortalPushTransfersCodeByCode,
  postPortalPushTransfersCodeByCodeAccept,
  postPortalPushTransfersCodeByCodeReject,
  getPortalInstances,
} from '@/api'
import type {
  PortalPushTransferResponse,
  PortalPushTransferInstanceInfo,
} from '@/api'
import {
  getPortalPushTransfersQueryKey,
} from '@/api/@tanstack/react-query.gen'

import { useSiteName, useFormatAmount, useFormatDate } from '@/hooks/use-site-settings'
import { useConfirm } from '@/hooks/use-confirm'
import { SimplePagination } from '@/components/simple-pagination'
import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getErrorMessage } from '@/lib/utils'

const statusMap: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' | 'destructive' }> = {
  pending: { label: '待接收', variant: 'outline' },
  pending_approval: { label: '待审批', variant: 'secondary' },
  accepted: { label: '已完成', variant: 'default' },
  cancelled: { label: '已取消', variant: 'outline' },
  rejected: { label: '已拒绝', variant: 'destructive' },
  expired: { label: '已过期', variant: 'outline' },
}

const feePayerMap: Record<string, string> = {
  none: '无',
  sender: '转出方',
  receiver: '接收方',
}

export default function PortalTransfers() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  useDocumentTitle(`实例转移 - ${siteName}`)

  const [activeTab, setActiveTab] = useState('sent')

  // ══════════════════════════════════════
  //  发起的转移列表
  // ══════════════════════════════════════

  const [sentPage, setSentPage] = useState(1)
  const pageSize = 20

  const sentQuery = useQuery({
    queryKey: [...getPortalPushTransfersQueryKey(), { role: 'sender', page: sentPage, page_size: pageSize }],
    queryFn: () => getPortalPushTransfers({ query: { role: 'sender', page: sentPage, page_size: pageSize } }),
    placeholderData: keepPreviousData,
  })
  const sentLoading = sentQuery.isPending
  const sentList = sentQuery.data?.data?.data
  const sentItems: PortalPushTransferResponse[] = sentList?.items ?? []
  const sentTotal = sentList?.total ?? 0

  // ══════════════════════════════════════
  //  收到的转移列表
  // ══════════════════════════════════════

  const [receivedPage, setReceivedPage] = useState(1)

  const receivedQuery = useQuery({
    queryKey: [...getPortalPushTransfersQueryKey(), { role: 'receiver', page: receivedPage, page_size: pageSize }],
    queryFn: () => getPortalPushTransfers({ query: { role: 'receiver', page: receivedPage, page_size: pageSize } }),
    placeholderData: keepPreviousData,
  })
  const receivedLoading = receivedQuery.isPending
  const receivedList = receivedQuery.data?.data?.data
  const receivedItems: PortalPushTransferResponse[] = receivedList?.items ?? []
  const receivedTotal = receivedList?.total ?? 0

  // ══════════════════════════════════════
  //  取消转移
  // ══════════════════════════════════════

  const [cancelingId, setCancelingId] = useState<number | null>(null)

  const handleCancel = async (id: number) => {
    const ok = await confirm({
      title: '取消转移',
      description: '确定要取消这个转移请求吗？已扣除的手续费将退还。',
      confirmText: '确定取消',
      destructive: true,
    })
    if (!ok) return
    setCancelingId(id)
    try {
      await postPortalPushTransfersByIdCancel({ path: { id } })
      toast.success('转移已取消')
      queryClient.invalidateQueries({ queryKey: getPortalPushTransfersQueryKey() })
    } catch (err) {
      toast.error(getErrorMessage(err, '取消失败'))
    } finally {
      setCancelingId(null)
    }
  }

  // ══════════════════════════════════════
  //  发起转移对话框
  // ══════════════════════════════════════

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const instancesQuery = useQuery({
    queryKey: ['portalInstances', 'forTransfer'],
    queryFn: () => getPortalInstances({ query: { page: 1, page_size: 100 } }),
    enabled: createOpen,
  })
  const instances = instancesQuery.data?.data?.data?.items ?? []

  const openCreate = () => {
    setSelectedInstanceId('')
    setCreatedCode(null)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!selectedInstanceId) {
      toast.error('请选择要转移的实例')
      return
    }
    setCreating(true)
    try {
      const res = await postPortalPushTransfers({
        body: { instance_id: Number(selectedInstanceId) },
      })
      const body = res.data as { code?: number; data?: PortalPushTransferResponse }
      const code = body?.data?.code ?? ''
      setCreatedCode(code)
      toast.success('转移请求已创建')
      queryClient.invalidateQueries({ queryKey: getPortalPushTransfersQueryKey() })
    } catch (err) {
      toast.error(getErrorMessage(err, '创建失败'))
    } finally {
      setCreating(false)
    }
  }

  // ══════════════════════════════════════
  //  接收转移对话框
  // ══════════════════════════════════════

  const [receiveOpen, setReceiveOpen] = useState(false)
  const [transferCode, setTransferCode] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState<{
    transfer: PortalPushTransferResponse
    instance: PortalPushTransferInstanceInfo
  } | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const openReceive = () => {
    setTransferCode('')
    setLookupResult(null)
    setReceiveOpen(true)
  }

  const handleLookup = async () => {
    const code = transferCode.trim().toUpperCase()
    if (!code) {
      toast.error('请输入转移码')
      return
    }
    setLookupLoading(true)
    try {
      const res = await getPortalPushTransfersCodeByCode({ path: { code } })
      const body = res.data as { code?: number; data?: { transfer?: PortalPushTransferResponse; instance?: PortalPushTransferInstanceInfo } }
      if (body?.data?.transfer && body?.data?.instance) {
        setLookupResult({ transfer: body.data.transfer, instance: body.data.instance })
      }
    } catch (err) {
      toast.error(getErrorMessage(err, '查询失败'))
    } finally {
      setLookupLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!lookupResult) return
    const code = lookupResult.transfer.code!
    setAccepting(true)
    try {
      const res = await postPortalPushTransfersCodeByCodeAccept({ path: { code } })
      const body = res.data as { code?: number; message?: string }
      if (body?.code === 22813) {
        toast.success('已提交，等待管理员审批')
      } else {
        toast.success('转移已接受')
      }
      setReceiveOpen(false)
      queryClient.invalidateQueries({ queryKey: getPortalPushTransfersQueryKey() })
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, '接受失败'))
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    if (!lookupResult) return
    const code = lookupResult.transfer.code!
    setRejecting(true)
    try {
      await postPortalPushTransfersCodeByCodeReject({ path: { code } })
      toast.success('已拒绝该转移')
      setReceiveOpen(false)
      queryClient.invalidateQueries({ queryKey: getPortalPushTransfersQueryKey() })
    } catch (err) {
      toast.error(getErrorMessage(err, '拒绝失败'))
    } finally {
      setRejecting(false)
    }
  }

  // ══════════════════════════════════════
  //  渲染
  // ══════════════════════════════════════

  const renderTransferItem = (item: PortalPushTransferResponse, isSender: boolean) => {
    const st = statusMap[item.status ?? ''] ?? { label: item.status, variant: 'outline' as const }
    return (
      <div key={item.id} className="rounded-md border px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-mono text-sm font-medium tracking-wider">{item.code}</span>
            <CopyButton value={item.code ?? ''} />
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
            {(item.fee_amount ?? 0) > 0 && (
              <span>手续费: {formatAmount(item.fee_amount ?? 0)}（{feePayerMap[item.fee_payer ?? ''] ?? item.fee_payer}）</span>
            )}
            <span>创建: {formatDate(item.created_at ?? '')}</span>
            <span>过期: {formatDate(item.expires_at ?? '')}</span>
          </div>
          {isSender && (item.status === 'pending' || item.status === 'pending_approval') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCancel(item.id!)}
              disabled={cancelingId === item.id}
              className="shrink-0"
            >
              {cancelingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : '取消'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-md border px-4 py-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-4 w-32 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )

  const renderEmpty = () => (
    <div className="rounded-xl border border-dashed py-16 text-center">
      <ArrowLeftRight className="mx-auto size-8 text-muted-foreground/50" />
      <p className="mt-2 text-sm text-muted-foreground">暂无转移记录</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">实例转移</h1>
          <p className="mt-1 text-sm text-muted-foreground">通过转移码将实例转让给其他用户，或接收他人转入的实例</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openReceive}>
            <ReceiveIcon className="size-4" />
            接收转移
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Send className="size-4" />
            发起转移
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-2">
          <TabsTrigger value="sent">发起的转移</TabsTrigger>
          <TabsTrigger value="received">收到的转移</TabsTrigger>
        </TabsList>

        <TabsContent value="sent">
          <div className="rounded-2xl bg-background p-6 sm:p-8">
            <h3 className="text-sm font-medium">发起的转移</h3>
            <p className="text-xs text-muted-foreground mt-1">您发起的实例转移请求</p>
            <div className="mt-4">
              {sentLoading ? renderSkeleton() : sentItems.length === 0 ? renderEmpty() : (
                <>
                  <div className="space-y-3">
                    {sentItems.map((item) => renderTransferItem(item, true))}
                  </div>
                  <div className="mt-4">
                    <SimplePagination page={sentPage} pageSize={pageSize} total={sentTotal} onChange={setSentPage} />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="received">
          <div className="rounded-2xl bg-background p-6 sm:p-8">
            <h3 className="text-sm font-medium">收到的转移</h3>
            <p className="text-xs text-muted-foreground mt-1">其他用户转入给您的实例</p>
            <div className="mt-4">
              {receivedLoading ? renderSkeleton() : receivedItems.length === 0 ? renderEmpty() : (
                <>
                  <div className="space-y-3">
                    {receivedItems.map((item) => renderTransferItem(item, false))}
                  </div>
                  <div className="mt-4">
                    <SimplePagination page={receivedPage} pageSize={pageSize} total={receivedTotal} onChange={setReceivedPage} />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ 发起转移对话框 ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>发起实例转移</DialogTitle>
            <DialogDescription>
              选择要转移的实例，确认后将生成转移码
            </DialogDescription>
          </DialogHeader>

          {createdCode ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">转移码已生成，请将此码发送给接收方：</p>
              <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 px-6 py-4">
                <span className="font-mono text-2xl font-bold tracking-[0.3em]">{createdCode}</span>
                <CopyButton value={createdCode} className="size-8" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">接收方在「接收转移」中输入此码即可接收实例</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>选择实例</Label>
                <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择要转移的实例" />
                  </SelectTrigger>
                  <SelectContent>
                    {(instances as Array<{ id?: number; name?: string; ip_address?: string; status?: string }>).map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name} {inst.ip_address ? `(${inst.ip_address})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdCode ? (
              <Button onClick={() => setCreateOpen(false)}>完成</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={creating || !selectedInstanceId}>
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  确认发起
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ 接收转移对话框 ═══ */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>接收实例转移</DialogTitle>
            <DialogDescription>
              输入对方提供的转移码查看实例信息
            </DialogDescription>
          </DialogHeader>

          {!lookupResult ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>转移码</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="输入 8 位转移码"
                    value={transferCode}
                    onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono tracking-wider uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  />
                  <Button onClick={handleLookup} disabled={lookupLoading || !transferCode.trim()}>
                    {lookupLoading ? <Loader2 className="size-4 animate-spin" /> : '查询'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{lookupResult.instance.name}</span>
                  <Badge variant="outline">{lookupResult.instance.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>CPU: {lookupResult.instance.cpu} 核</span>
                  <span>内存: {lookupResult.instance.memory} MB</span>
                  <span>磁盘: {lookupResult.instance.disk} GB</span>
                  <span>IP: {lookupResult.instance.ip_address || '-'}</span>
                  <span>计费周期: {lookupResult.instance.billing_cycle}</span>
                  <span>到期: {lookupResult.instance.expire_at ? formatDate(lookupResult.instance.expire_at) : '-'}</span>
                </div>
                {(lookupResult.transfer.fee_amount ?? 0) > 0 && (
                  <div className="pt-2 border-t text-sm">
                    手续费: <span className="font-medium">{formatAmount(lookupResult.transfer.fee_amount ?? 0)}</span>
                    （{feePayerMap[lookupResult.transfer.fee_payer ?? ''] ?? lookupResult.transfer.fee_payer}承担）
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {lookupResult ? (
              <>
                <Button variant="outline" onClick={() => setLookupResult(null)}>返回</Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejecting || accepting}
                >
                  {rejecting && <Loader2 className="size-4 animate-spin" />}
                  拒绝
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={accepting || rejecting}
                >
                  {accepting && <Loader2 className="size-4 animate-spin" />}
                  接受转移
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setReceiveOpen(false)}>关闭</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  )
}
