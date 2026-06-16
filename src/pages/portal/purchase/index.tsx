import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Cpu, HardDrive, MemoryStick, Globe, Loader2, Tag, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { getPortalPlans, postPortalOrders, getPortalSshKeys, postPortalCouponsValidate } from '@/api'
import type { PortalPurchasePlanItem, PortalPurchaseNodeItem, PortalPurchaseImageItem, PortalSshKeyItem } from '@/api'
import { useSiteName, useFormatAmount, useSiteSettings } from '@/hooks/use-site-settings'
import { formatMemory, getErrorMessage, generateHostname, generatePassword } from '@/lib/utils'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { billingCycleMap } from '@/lib/order-constants'

type BillingCycle = 'hourly' | 'monthly' | 'quarterly' | 'yearly'

function getPlanPrice(plan: PortalPurchasePlanItem, cycle: BillingCycle): number {
  switch (cycle) {
    case 'hourly': return (plan as Record<string, number>).price_hourly ?? 0
    case 'monthly': return plan.price_monthly ?? 0
    case 'quarterly': return plan.price_quarterly ?? 0
    case 'yearly': return plan.price_yearly ?? 0
  }
}

export default function PortalPurchase() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const navigate = useNavigate()
  const settings = useSiteSettings()
  useDocumentTitle(`选购云服务器 - ${siteName}`)

  const newHostname = () => generateHostname(
    settings.instance_hostname_prefix,
    settings.instance_hostname_suffix_type,
    Number(settings.instance_hostname_suffix_length) || 8,
  )
  const newPassword = () => generatePassword(Number(settings.instance_auto_password_length) || 16)

  const [plans, setPlans] = useState<PortalPurchasePlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly')
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [hostname, setHostname] = useState(newHostname)
  const [password, setPassword] = useState(() =>
    settings.instance_auto_password !== 'false' ? newPassword() : ''
  )
  const [showPassword, setShowPassword] = useState(false)
  const [sshKeys, setSshKeys] = useState<PortalSshKeyItem[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponValidating, setCouponValidating] = useState(false)

  useEffect(() => {
    getPortalSshKeys().then(({ data: res }) => setSshKeys(res?.data ?? []))
    getPortalPlans().then(({ data: res }) => {
      const items = res?.data?.plans ?? []
      setPlans(items)
      if (items.length > 0) {
        setSelectedPlanId(items[0].id ?? null)
      }
    }).finally(() => setLoading(false))
  }, [])

  const selectedPlan = useMemo(() =>
    plans.find(p => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  )

  const nodes: PortalPurchaseNodeItem[] = selectedPlan?.nodes ?? []
  const images: PortalPurchaseImageItem[] = selectedPlan?.images ?? []

  useEffect(() => {
    const planNodes = selectedPlan?.nodes ?? []
    const planImages = selectedPlan?.images ?? []
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 套餐切换时重置选择
    setSelectedNodeId(planNodes[0]?.id ?? null)
    setSelectedImageId(planImages[0]?.id ?? null)
    // 自动选择第一个有正价的计费周期
    if (selectedPlan) {
      const cycles: BillingCycle[] = ['hourly', 'monthly', 'quarterly', 'yearly']
      const firstAvailable = cycles.find(c => getPlanPrice(selectedPlan, c) > 0)
      if (firstAvailable) {
        setSelectedCycle(firstAvailable)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 套餐/周期变化时重置优惠
    setCouponDiscount(0)
  }, [selectedPlanId, selectedCycle])

  const price = selectedPlan ? getPlanPrice(selectedPlan, selectedCycle) : 0
  const finalPrice = Math.max(0, price - couponDiscount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || price <= 0) return
    setCouponValidating(true)
    try {
      const { data: res } = await postPortalCouponsValidate({
        body: { code: couponCode.trim(), order_type: 'new', amount: price },
      })
      if (res?.code === 0 && res.data) {
        setCouponDiscount(res.data.discount_amount ?? 0)
        toast.success(`优惠券已应用，优惠 ${formatAmount(res.data.discount_amount ?? 0)}`)
      } else {
        setCouponDiscount(0)
        toast.error(res?.message || '优惠券不可用')
      }
    } catch (err) {
      setCouponDiscount(0)
      toast.error(getErrorMessage(err, '验证优惠券失败'))
    } finally {
      setCouponValidating(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode('')
    setCouponDiscount(0)
  }

  const handleSubmit = async () => {
    if (!selectedPlanId || !selectedNodeId || !selectedImageId) {
      toast.error('请完成所有选项')
      return
    }
    if (!hostname.trim()) {
      toast.error('请输入主机名')
      return
    }
    if (!password || password.length < 8) {
      toast.error('密码至少 8 个字符')
      return
    }
    setSubmitting(true)
    try {
      const { data: res } = await postPortalOrders({
        body: {
          plan_id: selectedPlanId,
          node_id: selectedNodeId,
          image_id: selectedImageId,
          billing_cycle: selectedCycle,
          hostname: hostname.trim(),
          password,
          ...(selectedKeyId ? { ssh_key_id: selectedKeyId } : {}),
          ...(couponDiscount > 0 && couponCode ? { coupon_code: couponCode.trim() } : {}),
        },
      })
      if (res?.code === 0 && res.data) {
        toast.success('订单已创建，请前往支付')
        navigate(`/portal/orders/${res.data.id}`)
      } else {
        toast.error(res?.message || '创建订单失败')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, '创建订单失败'))
    } finally {
      setSubmitting(false)
    }
  }

  const pageHeader = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">选购云服务器</h1>
      <p className="mt-1 text-sm text-muted-foreground">选择配置，创建您的云服务器</p>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-background p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
              <Skeleton className="h-8 w-24 mt-4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-8">
        {pageHeader}
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-background">
          <Cpu className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">暂无可用套餐</p>
          <p className="text-xs text-muted-foreground mt-1">管理员尚未上架任何套餐，请稍后再来</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {pageHeader}

      {/* 套餐选择 */}
      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">选择套餐</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const active = plan.id === selectedPlanId
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id ?? null)}
                className={`relative rounded-2xl p-5 text-left transition-colors ${
                  active
                    ? 'bg-foreground/5 ring-2 ring-foreground/20'
                    : 'bg-background hover:bg-foreground/[.05]'
                }`}
              >
                {active && (
                  <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-foreground">
                    <Check className="size-3 text-background" />
                  </div>
                )}
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Cpu className="size-3" />{plan.cpu} vCPU</span>
                  <span className="inline-flex items-center gap-1"><MemoryStick className="size-3" />{formatMemory(plan.memory ?? 0)}</span>
                  <span className="inline-flex items-center gap-1"><HardDrive className="size-3" />{plan.disk} GB</span>
                </div>
                {(plan.bandwidth ?? 0) > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    <Globe className="size-3" />
                    {plan.bandwidth} Mbps
                    {(plan.traffic ?? 0) > 0 && ` / ${plan.traffic} GB`}
                  </div>
                )}
                <p className="text-lg font-semibold mt-3">
                  {formatAmount(getPlanPrice(plan, selectedCycle))}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    /{billingCycleMap[selectedCycle] ?? selectedCycle}
                  </span>
                </p>
                {plan.stock !== undefined && plan.stock >= 0 && plan.stock < 10 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">剩余 {plan.stock} 台</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 计费周期 */}
      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">计费周期</h2>
        <div className="flex gap-2">
          {(['hourly', 'monthly', 'quarterly', 'yearly'] as BillingCycle[]).map((cycle) => {
            const active = cycle === selectedCycle
            const cyclePrice = selectedPlan ? getPlanPrice(selectedPlan, cycle) : 0
            if (cyclePrice <= 0) return null
            return (
              <button
                key={cycle}
                onClick={() => setSelectedCycle(cycle)}
                className={`rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-background hover:bg-foreground/[.05]'
                }`}
              >
                {billingCycleMap[cycle]}
                <span className={`block text-xs font-normal mt-0.5 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {formatAmount(cyclePrice)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 节点选择 */}
      {nodes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">选择节点</h2>
          <div className="flex flex-wrap gap-2">
            {nodes.map((node) => {
              const active = node.id === selectedNodeId
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id ?? null)}
                  className={`rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-foreground text-background'
                      : 'bg-background hover:bg-foreground/[.05]'
                  }`}
                >
                  {node.name}
                  {node.region && (
                    <span className={`block text-xs font-normal mt-0.5 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
                      {node.region}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 系统镜像 */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">系统镜像</h2>
          <div className="max-w-xs">
            <Select
              value={selectedImageId?.toString() ?? ''}
              onValueChange={(v) => setSelectedImageId(Number(v))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="选择系统镜像" />
              </SelectTrigger>
              <SelectContent>
                {images.map((img) => (
                  <SelectItem key={img.id} value={img.id!.toString()}>
                    {img.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 主机名和密码 */}
      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">基本配置</h2>
        <div className="rounded-2xl bg-background p-6">
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="hostname">主机名</Label>
              <div className="flex gap-2">
                <Input
                  id="hostname"
                  placeholder="my-server"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setHostname(newHostname())}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">root 密码</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少 8 个字符"
                    className="pr-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setPassword(newPassword())}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </div>
          </div>
          {sshKeys.length > 0 && (
            <div className="mt-6">
              <Label className="mb-2 block">SSH 密钥（可选）</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedKeyId(null)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    selectedKeyId === null
                      ? 'bg-foreground text-background'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  不使用
                </button>
                {sshKeys.map((key) => {
                  const active = key.id === selectedKeyId
                  return (
                    <button
                      key={key.id}
                      onClick={() => setSelectedKeyId(key.id ?? null)}
                      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-foreground text-background'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {key.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 优惠券 */}
      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">优惠券</h2>
        <div className="rounded-2xl bg-background p-6">
          <div className="flex items-end gap-3 max-w-md">
            <div className="flex-1 space-y-2">
              <Label htmlFor="coupon">优惠码</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="coupon"
                  placeholder="输入优惠码"
                  className="pl-9 font-mono uppercase"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponDiscount > 0) { setCouponDiscount(0) } }}
                  disabled={couponDiscount > 0}
                />
              </div>
            </div>
            {couponDiscount > 0 ? (
              <Button variant="outline" onClick={handleRemoveCoupon}>取消</Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || couponValidating || price <= 0}
              >
                {couponValidating && <Loader2 className="size-4 animate-spin" />}
                使用
              </Button>
            )}
          </div>
          {couponDiscount > 0 && couponDiscount > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">已优惠 {formatAmount(couponDiscount)}</p>
          )}
        </div>
      </div>

      {/* 确认下单 */}
      <div className="rounded-2xl bg-background p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {selectedPlan?.name} · {billingCycleMap[selectedCycle]}
            </p>
            {couponDiscount > 0 ? (
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-semibold">{formatAmount(finalPrice)}</p>
                <p className="text-sm text-muted-foreground line-through">{formatAmount(price)}</p>
              </div>
            ) : (
              <p className="text-2xl font-semibold mt-1">{formatAmount(price)}</p>
            )}
          </div>
          <Button
            size="lg"
            className="px-8"
            disabled={submitting || !selectedPlanId || !selectedNodeId || !selectedImageId || !hostname || !password}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            立即下单
          </Button>
        </div>
      </div>
    </div>
  )
}
