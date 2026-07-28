import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { FileText, Plus, Pencil, Trash2, Download, Loader2, ReceiptText } from 'lucide-react'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'

import {
  postPortalInvoiceProfiles,
  putPortalInvoiceProfilesById,
  deletePortalInvoiceProfilesById,
  getPortalInvoices,
  postPortalInvoices,
  deletePortalInvoicesById,
} from '@/api'
import type {
  PortalPortalInvoiceProfileItem,
  PortalPortalInvoiceItem,
  PortalCreateInvoiceProfileRequest,
} from '@/api'
import {
  getPortalInvoiceProfilesQueryKey,
  getPortalInvoicesQueryKey,
  getPortalInvoicesQuotaQueryKey,
  getPortalInvoiceProfilesOptions,
  getPortalInvoicesQuotaOptions,
} from '@/api/@tanstack/react-query.gen'

import { useSiteName, useFormatAmount, useFormatDate } from '@/hooks/use-site-settings'
import { useConfirm } from '@/hooks/use-confirm'

import { SimplePagination } from '@/components/simple-pagination'
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
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { getErrorMessage } from '@/lib/utils'

// ── 状态映射 ──
const statusMap: Record<string, { label: string; variant: 'outline' | 'secondary' | 'default' | 'destructive' }> = {
  pending: { label: '待审核', variant: 'outline' },
  approved: { label: '待开票', variant: 'secondary' },
  issued: { label: '已开票', variant: 'default' },
  rejected: { label: '已驳回', variant: 'destructive' },
}

// ── 抬头表单初始值 ──
const emptyProfileForm: PortalCreateInvoiceProfileRequest = {
  type: 'personal',
  title: '',
  tax_number: '',
  email: '',
  is_default: false,
}

export default function PortalInvoices() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  useDocumentTitle(`发票 - ${siteName}`)

  const [activeTab, setActiveTab] = useState('apply')

  // ══════════════════════════════════════
  //  Tab 1: 申请开票
  // ══════════════════════════════════════

  const quotaQuery = useQuery(getPortalInvoicesQuotaOptions())
  const quota = quotaQuery.data?.data
  const quotaLoading = quotaQuery.isPending

  const profilesQuery = useQuery(getPortalInvoiceProfilesOptions())
  const profiles: PortalPortalInvoiceProfileItem[] = profilesQuery.data?.data ?? []
  const profilesLoading = profilesQuery.isPending

  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [applyAmount, setApplyAmount] = useState('')
  const [applySubmitting, setApplySubmitting] = useState(false)

  // 提交开票申请
  const handleApply = async () => {
    if (!selectedProfileId) {
      toast.error('请选择发票抬头')
      return
    }
    const yuan = parseFloat(applyAmount)
    if (isNaN(yuan) || yuan <= 0) {
      toast.error('请输入有效的开票金额')
      return
    }
    const fen = Math.round(yuan * 100)
    if (quota?.available !== undefined && fen > quota.available) {
      toast.error('开票金额不能超过可开票额度')
      return
    }
    setApplySubmitting(true)
    try {
      await postPortalInvoices({
        body: { amount: fen, profile_id: Number(selectedProfileId) },
      })
      toast.success('开票申请已提交')
      setApplyAmount('')
      setSelectedProfileId('')
      queryClient.invalidateQueries({ queryKey: getPortalInvoicesQueryKey() })
      queryClient.invalidateQueries({ queryKey: getPortalInvoicesQuotaQueryKey() })
      setActiveTab('records')
    } catch (err) {
      toast.error(getErrorMessage(err, '提交失败'))
    } finally {
      setApplySubmitting(false)
    }
  }

  // ══════════════════════════════════════
  //  Tab 2: 发票记录
  // ══════════════════════════════════════

  const [recordPage, setRecordPage] = useState(1)
  const recordPageSize = 20
  const [cancelingId, setCancelingId] = useState<number | null>(null)

  const invoicesQuery = useQuery({
    queryKey: [...getPortalInvoicesQueryKey(), { page: recordPage, page_size: recordPageSize }],
    queryFn: () => getPortalInvoices({ query: { page: recordPage, page_size: recordPageSize } }),
    placeholderData: keepPreviousData,
  })
  const invoicesLoading = invoicesQuery.isPending
  const invoicesList = invoicesQuery.data?.data?.data
  const invoices: PortalPortalInvoiceItem[] = invoicesList?.items ?? []
  const invoicesTotal = invoicesList?.total ?? 0

  // 取消开票申请
  const handleCancelInvoice = async (id: number) => {
    const ok = await confirm({
      title: '取消申请',
      description: '确定要取消这条开票申请吗？',
      confirmText: '确定取消',
      destructive: true,
    })
    if (!ok) return
    setCancelingId(id)
    try {
      await deletePortalInvoicesById({ path: { id } })
      toast.success('已取消')
      queryClient.invalidateQueries({ queryKey: getPortalInvoicesQueryKey() })
      queryClient.invalidateQueries({ queryKey: getPortalInvoicesQuotaQueryKey() })
    } catch (err) {
      toast.error(getErrorMessage(err, '取消失败'))
    } finally {
      setCancelingId(null)
    }
  }

  // ══════════════════════════════════════
  //  Tab 3: 发票抬头管理
  // ══════════════════════════════════════

  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<PortalPortalInvoiceProfileItem | null>(null)
  const [profileForm, setProfileForm] = useState<PortalCreateInvoiceProfileRequest>(emptyProfileForm)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 打开新增对话框
  const openCreateProfile = () => {
    setEditingProfile(null)
    setProfileForm(emptyProfileForm)
    setProfileDialogOpen(true)
  }

  // 打开编辑对话框
  const openEditProfile = (p: PortalPortalInvoiceProfileItem) => {
    setEditingProfile(p)
    setProfileForm({
      type: (p.type as 'personal' | 'enterprise') || 'personal',
      title: p.title ?? '',
      tax_number: p.tax_number ?? '',
      email: p.email ?? '',
      is_default: p.is_default ?? false,
    })
    setProfileDialogOpen(true)
  }

  // 提交抬头表单（新增/编辑）
  const handleProfileSubmit = async () => {
    if (!profileForm.title.trim()) {
      toast.error('请输入发票抬头')
      return
    }
    if (!profileForm.email.trim()) {
      toast.error('请输入接收邮箱')
      return
    }
    if (profileForm.type === 'enterprise' && !profileForm.tax_number?.trim()) {
      toast.error('企业类型请填写税号')
      return
    }
    setProfileSubmitting(true)
    try {
      if (editingProfile?.id) {
        await putPortalInvoiceProfilesById({
          path: { id: editingProfile.id },
          body: profileForm,
        })
        toast.success('抬头已更新')
      } else {
        await postPortalInvoiceProfiles({ body: profileForm })
        toast.success('抬头已添加')
      }
      setProfileDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: getPortalInvoiceProfilesQueryKey() })
    } catch (err) {
      toast.error(getErrorMessage(err, '保存失败'))
    } finally {
      setProfileSubmitting(false)
    }
  }

  // 删除抬头
  const handleDeleteProfile = async (id: number) => {
    const ok = await confirm({
      title: '删除抬头',
      description: '确定要删除这个发票抬头吗？',
      confirmText: '确定删除',
      destructive: true,
    })
    if (!ok) return
    setDeletingId(id)
    try {
      await deletePortalInvoiceProfilesById({ path: { id } })
      toast.success('已删除')
      queryClient.invalidateQueries({ queryKey: getPortalInvoiceProfilesQueryKey() })
    } catch (err) {
      toast.error(getErrorMessage(err, '删除失败'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">发票</h1>
        <p className="mt-1 text-sm text-muted-foreground">申请开票、查看发票记录和管理发票抬头</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-2">
          <TabsTrigger value="apply">申请开票</TabsTrigger>
          <TabsTrigger value="records">发票记录</TabsTrigger>
          <TabsTrigger value="profiles">发票抬头</TabsTrigger>
        </TabsList>

        {/* ═══ 申请开票 ═══ */}
        <TabsContent value="apply">
          <div className="rounded-2xl bg-background p-6 sm:p-8">
            {/* 额度信息 */}
            <h3 className="text-sm font-medium">开票额度</h3>
            <p className="text-xs text-muted-foreground mt-1">
              您的消费金额和可开票额度
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              {quotaLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-7 w-24 mt-2" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">累计消费</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(quota?.consumed ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">已开票</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(quota?.invoiced ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">可开票</p>
                    <p className="text-xl font-semibold mt-1 text-primary">
                      {formatAmount(quota?.available ?? 0)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {quota?.notice && (
              <div className="mt-6 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-medium mb-1">开票须知</p>
                <p className="whitespace-pre-line">{quota.notice}</p>
              </div>
            )}

            <Separator className="my-8" />

            {/* 开票表单 */}
            <h3 className="text-sm font-medium">填写开票信息</h3>
            <p className="text-xs text-muted-foreground mt-1">选择抬头并输入开票金额</p>

            {profilesLoading ? (
              <div className="mt-4 max-w-md space-y-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed py-8 text-center max-w-md">
                <ReceiptText className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">暂无发票抬头</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setActiveTab('profiles')
                    setTimeout(openCreateProfile, 100)
                  }}
                >
                  <Plus className="size-4" />
                  新增抬头
                </Button>
              </div>
            ) : (
              <div className="mt-4 max-w-md space-y-4">
                <div className="space-y-2">
                  <Label>发票抬头</Label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择发票抬头" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.title}
                          {p.is_default && ' (默认)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>开票金额（元）</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="请输入金额"
                    value={applyAmount}
                    onChange={(e) => setApplyAmount(e.target.value)}
                  />
                  {quota?.available !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      最多可开 {formatAmount(quota.available)}
                    </p>
                  )}
                </div>
                <Button onClick={handleApply} disabled={applySubmitting}>
                  {applySubmitting && <Loader2 className="size-4 animate-spin" />}
                  提交申请
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ 发票记录 ═══ */}
        <TabsContent value="records">
          <div className="rounded-2xl bg-background p-6 sm:p-8">
            <h3 className="text-sm font-medium">发票记录</h3>
            <p className="text-xs text-muted-foreground mt-1">您的开票申请和发票状态</p>

            <div className="mt-4">
              {invoicesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-4 w-28 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                  <FileText className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">暂无发票记录</p>
                </div>
              ) : (
                <>
                  {/* 表头 */}
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto_1fr_auto] gap-4 px-4 py-2 text-xs text-muted-foreground font-medium">
                    <span>发票编号</span>
                    <span>抬头</span>
                    <span>金额</span>
                    <span>状态</span>
                    <span>申请时间</span>
                    <span>操作</span>
                  </div>
                  <div className="divide-y">
                    {invoices.map((inv) => {
                      const st = statusMap[inv.status ?? ''] ?? {
                        label: inv.status,
                        variant: 'outline' as const,
                      }
                      return (
                        <div
                          key={inv.id}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_1fr_auto] gap-2 sm:gap-4 px-4 py-3 items-center text-sm"
                        >
                          <span className="font-mono text-xs">{inv.invoice_no}</span>
                          <span className="truncate">{inv.title}</span>
                          <span className="font-medium">{formatAmount(inv.amount ?? 0)}</span>
                          <Badge variant={st.variant}>{st.label}</Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatDate(inv.created_at ?? '')}
                          </span>
                          <div className="flex gap-2 justify-end">
                            {inv.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvoice(inv.id!)}
                                disabled={cancelingId === inv.id}
                              >
                                {cancelingId === inv.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  '取消'
                                )}
                              </Button>
                            )}
                            {inv.status === 'issued' && inv.invoice_file_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={inv.invoice_file_url} target="_blank" rel="noreferrer">
                                  <Download className="size-3.5" />
                                  下载
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* 分页 */}
                  <div className="mt-4">
                    <SimplePagination
                      page={recordPage}
                      pageSize={recordPageSize}
                      total={invoicesTotal}
                      onChange={setRecordPage}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══ 发票抬头管理 ═══ */}
        <TabsContent value="profiles">
          <div className="rounded-2xl bg-background p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">发票抬头</h3>
                <p className="text-xs text-muted-foreground mt-1">管理您的发票抬头信息</p>
              </div>
              <Button size="sm" onClick={openCreateProfile}>
                <Plus className="size-4" />
                新增抬头
              </Button>
            </div>

            <div className="mt-4">
              {profilesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-xl border px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-10" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : profiles.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                  <ReceiptText className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">暂无发票抬头</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profiles.map((p) => (
                    <div key={p.id} className="rounded-xl border px-4 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge variant="outline">
                            {p.type === 'enterprise' ? '企业' : '个人'}
                          </Badge>
                          <span className="font-medium text-sm truncate">{p.title}</span>
                          {p.is_default && (
                            <Badge variant="secondary" className="shrink-0">
                              默认
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          {p.tax_number && <span>税号: {p.tax_number}</span>}
                          <span>{p.email}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditProfile(p)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleDeleteProfile(p.id!)}
                            disabled={deletingId === p.id}
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ 抬头新增/编辑对话框 ═══ */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProfile ? '编辑抬头' : '新增抬头'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={profileForm.type}
                onValueChange={(v) =>
                  setProfileForm((f) => ({ ...f, type: v as 'personal' | 'enterprise' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">个人</SelectItem>
                  <SelectItem value="enterprise">企业</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>发票抬头</Label>
              <Input
                placeholder={profileForm.type === 'enterprise' ? '公司全称' : '个人姓名'}
                value={profileForm.title}
                onChange={(e) => setProfileForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            {profileForm.type === 'enterprise' && (
              <div className="space-y-2">
                <Label>税号</Label>
                <Input
                  placeholder="纳税人识别号"
                  value={profileForm.tax_number}
                  onChange={(e) => setProfileForm((f) => ({ ...f, tax_number: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>接收邮箱</Label>
              <Input
                type="email"
                placeholder="用于接收电子发票"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_default"
                checked={profileForm.is_default}
                onCheckedChange={(checked) =>
                  setProfileForm((f) => ({ ...f, is_default: checked === true }))
                }
              />
              <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
                设为默认抬头
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleProfileSubmit} disabled={profileSubmitting}>
              {profileSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingProfile ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  )
}
