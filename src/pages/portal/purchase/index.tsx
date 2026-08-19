import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Cpu, HardDrive, MemoryStick, Globe, Loader2, Tag, RefreshCw } from 'lucide-react'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { postPortalOrders, postPortalCouponsValidate } from '@/api'
import { getPortalPlansOptions, getPortalSshKeysOptions } from '@/api/@tanstack/react-query.gen'
import type { PortalPurchasePlanItem, PortalPurchaseRegionItem } from '@/api'
import { useSiteName, useFormatAmount, useSiteSettings } from '@/hooks/use-site-settings'
import { formatMemory, getErrorMessage, generateHostname, generatePassword } from '@/lib/utils'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'
import { billingCycleMap } from '@/lib/order-constants'

type BillingCycle = 'hourly' | 'monthly' | 'quarterly' | 'yearly'

function isPlanSoldOut(plan: PortalPurchasePlanItem): boolean {
  return plan.stock !== undefined && plan.stock === 0
}

function isCycleEnabled(plan: PortalPurchasePlanItem, cycle: BillingCycle): boolean {
  const raw = plan.enabled_cycles ?? ''
  if (!raw) return getPlanPrice(plan, cycle) > 0
  return raw.split(',').includes(cycle)
}

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

  const [submitting, setSubmitting] = useState(false)

  const [userRegionId, setUserRegionId] = useState<number | null>(null)
  const [userPlanId, setUserPlanId] = useState<number | null>(null)
  const [userCycle, setUserCycle] = useState<BillingCycle | null>(null)
  const [userImageId, setUserImageId] = useState<number | null>(null)
  const [hostname, setHostname] = useState(newHostname)
  const [password, setPassword] = useState(() =>
    settings.instance_auto_password !== 'false' ? newPassword() : ''
  )
  const [showPassword, setShowPassword] = useState(false)
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponValidating, setCouponValidating] = useState(false)

  const maxQuantity = Math.min(Number(settings.instance_batch_max_quantity) || 10, 100)

  const sshKeysQuery = useQuery(getPortalSshKeysOptions())
  const sshKeys = sshKeysQuery.data?.data ?? []

  const plansQuery = useQuery(getPortalPlansOptions())
  const allPlans = useMemo(() => plansQuery.data?.data?.plans ?? [], [plansQuery.data])
  const loading = plansQuery.isPending

  // 从所有套餐中提取去重的区域列表
  const regions = useMemo(() => {
    const map = new Map<number, PortalPurchaseRegionItem>()
    for (const plan of allPlans) {
      for (const region of plan.regions ?? []) {
        if (region.id != null && !map.has(region.id)) {
          map.set(region.id, region)
        }
      }
    }
    return Array.from(map.values())
  }, [allPlans])

  // 区域可用性：该区域在至少一个未售罄套餐中 available
  const regionAvailable = useMemo(() => {
    const set = new Set<number>()
    for (const plan of allPlans) {
      if (isPlanSoldOut(plan)) continue
      for (const r of plan.regions ?? []) {
        if (r.id != null && r.available) set.add(r.id)
      }
    }
    return set
  }, [allPlans])

  // 派生选中区域
  const selectedRegionId = regions.some(r => r.id === userRegionId)
    ? userRegionId
    : regions.find(r => r.id != null && regionAvailable.has(r.id))?.id ?? regions[0]?.id ?? null

  // 根据选中区域过滤套餐
  const plans = useMemo(() => {
    if (selectedRegionId == null) return allPlans
    return allPlans.filter(p =>
      (p.regions ?? []).some(r => r.id === selectedRegionId)
    )
  }, [allPlans, selectedRegionId])

  // 套餐在当前区域的可用性
  const planAvailability = useMemo(() => {
    const map = new Map<number, boolean>()
    for (const plan of plans) {
      if (isPlanSoldOut(plan)) { map.set(plan.id!, false); continue }
      if (selectedRegionId == null) { map.set(plan.id!, true); continue }
      const regionEntry = (plan.regions ?? []).find(r => r.id === selectedRegionId)
      map.set(plan.id!, regionEntry?.available ?? false)
    }
    return map
  }, [plans, selectedRegionId])

  const isPlanAvailable = (plan: PortalPurchasePlanItem) => planAvailability.get(plan.id!) ?? false

  const selectedPlan = useMemo(() => {
    const avail = (p: PortalPurchasePlanItem) => planAvailability.get(p.id!) ?? false
    const chosen = plans.find(p => p.id === userPlanId)
    if (chosen && avail(chosen)) return chosen
    return plans.find(avail) ?? null
  }, [plans, userPlanId, planAvailability])
  const selectedPlanId = selectedPlan?.id ?? null

  const images = useMemo(() => selectedPlan?.images ?? [], [selectedPlan])

  const allCycles: BillingCycle[] = ['hourly', 'monthly', 'quarterly', 'yearly']
  const selectedCycle: BillingCycle = userCycle
    ?? (selectedPlan ? allCycles.find(c => isCycleEnabled(selectedPlan, c)) : undefined)
    ?? 'monthly'
  const selectedImageId = images.some(img => img.id === userImageId)
    ? userImageId
    : images[0]?.id ?? null

  const selectedImage = useMemo(() => images.find(img => img.id === selectedImageId) ?? null, [images, selectedImageId])
  const isWindows = selectedImage?.os?.toLowerCase().includes('windows') ?? false

  const selectRegion = (regionId: number) => {
    setUserRegionId(regionId)
    setUserPlanId(null)
    setUserImageId(null)
    setUserCycle(null)
    setCouponDiscount(0)
  }

  const selectPlan = (plan: PortalPurchasePlanItem) => {
    setUserPlanId(plan.id ?? null)
    setUserImageId(null)
    setUserCycle(null)
    setCouponDiscount(0)
  }

  const unitPrice = selectedPlan ? getPlanPrice(selectedPlan, selectedCycle) : 0
  const price = unitPrice * quantity
  const finalPrice = Math.max(0, price - couponDiscount)
  const selectedPlanUnavailable = !selectedPlan || !isPlanAvailable(selectedPlan)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || unitPrice <= 0) return
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
    if (!selectedPlanId || !selectedRegionId || !selectedImageId || selectedPlanUnavailable) {
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
          region_id: selectedRegionId,
          image_id: selectedImageId,
          billing_cycle: selectedCycle,
          hostname: hostname.trim(),
          password,
          quantity,
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

  if (allPlans.length === 0) {
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

      {/* 选择区域 */}
      {regions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">选择区域</h2>
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => {
              const active = region.id === selectedRegionId
              const unavailable = region.id == null || !regionAvailable.has(region.id)
              return (
                <button
                  key={region.id}
                  onClick={() => region.id != null && selectRegion(region.id)}
                  className={`rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                    unavailable
                      ? 'bg-background opacity-50'
                      : active
                        ? 'bg-foreground text-background'
                        : 'bg-background hover:bg-foreground/[.05]'
                  }`}
                >
                  {region.flag && <span className="mr-1">{region.flag}</span>}
                  {region.display_name}
                  {unavailable && (
                    <span className="block text-xs font-normal mt-0.5 text-muted-foreground">暂无可用套餐</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 套餐选择 */}
      <div className="space-y-4" data-tour="purchase-plans">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">选择套餐</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const active = plan.id === selectedPlanId
            const soldOut = isPlanSoldOut(plan)
            const nodeUnavailable = !soldOut && !isPlanAvailable(plan)
            const disabled = soldOut || nodeUnavailable
            return (
              <button
                key={plan.id}
                disabled={disabled}
                onClick={() => selectPlan(plan)}
                className={`relative rounded-2xl p-5 text-left transition-colors ${
                  disabled
                    ? 'bg-background opacity-50 cursor-not-allowed'
                    : active
                      ? 'bg-foreground/5 ring-2 ring-foreground/20'
                      : 'bg-background hover:bg-foreground/[.05]'
                }`}
              >
                {soldOut && (
                  <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    售罄
                  </span>
                )}
                {nodeUnavailable && (
                  <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    售罄
                  </span>
                )}
                {!disabled && active && (
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
                {!soldOut && plan.stock !== undefined && plan.stock > 0 && plan.stock <= 5 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">仅剩 {plan.stock} 台</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 计费周期 */}
      <div className="space-y-4" data-tour="purchase-cycle">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">计费周期</h2>
        <div className="flex flex-wrap gap-2">
          {(['hourly', 'monthly', 'quarterly', 'yearly'] as BillingCycle[]).map((cycle) => {
            const active = cycle === selectedCycle
            const cyclePrice = selectedPlan ? getPlanPrice(selectedPlan, cycle) : 0
            if (!selectedPlan || !isCycleEnabled(selectedPlan, cycle)) return null
            return (
              <button
                key={cycle}
                onClick={() => { setUserCycle(cycle); setCouponDiscount(0) }}
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

      {/* 系统镜像 */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">系统镜像</h2>
          <div className="max-w-xs">
            <Select
              value={selectedImageId?.toString() ?? ''}
              onValueChange={(v) => setUserImageId(Number(v))}
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

      {/* 数量 */}
      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">购买数量</h2>
        <div className="rounded-2xl bg-background p-6">
          <div className="flex items-center gap-4 max-w-xs">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={quantity <= 1}
              onClick={() => { setQuantity(q => Math.max(1, q - 1)); setCouponDiscount(0) }}
            >
              −
            </Button>
            <Input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => {
                const v = Math.max(1, Math.min(maxQuantity, Number(e.target.value) || 1))
                setQuantity(v)
                setCouponDiscount(0)
              }}
              className="text-center font-semibold"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={quantity >= maxQuantity}
              onClick={() => { setQuantity(q => Math.min(maxQuantity, q + 1)); setCouponDiscount(0) }}
            >
              +
            </Button>
          </div>
          {quantity > 1 && (
            <p className="text-xs text-muted-foreground mt-2">
              单价 {formatAmount(unitPrice)} × {quantity} 台 = {formatAmount(price)}
            </p>
          )}
        </div>
      </div>

      {/* 主机名和密码 */}
      <div className="space-y-4" data-tour="purchase-config">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">基本配置</h2>
        <div className="rounded-2xl bg-background p-6">
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="hostname">主机名{quantity > 1 && '（基础名）'}</Label>
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
              {quantity > 1 && hostname.trim() && (
                <p className="text-xs text-muted-foreground">
                  将生成：{Array.from({ length: Math.min(quantity, 3) }, (_, i) => `${hostname.trim()}-${i + 1}`).join('、')}
                  {quantity > 3 && ` … 共 ${quantity} 台`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{isWindows ? 'Administrator 密码' : 'root 密码'}</Label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                onGenerate={() => setPassword(newPassword())}
              />
              {selectedImage && !selectedImage.cloud_init && (
                <p className="text-xs text-muted-foreground">该镜像不支持自动配置，请在系统安装过程中手动设置密码</p>
              )}
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
          {couponDiscount > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">已优惠 {formatAmount(couponDiscount)}</p>
          )}
        </div>
      </div>

      {/* 确认下单 */}
      <div className="rounded-2xl bg-background p-6" data-tour="purchase-submit">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {selectedPlan?.name} · {billingCycleMap[selectedCycle]}{quantity > 1 && ` × ${quantity} 台`}
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
            disabled={submitting || !selectedPlanId || !selectedRegionId || !selectedImageId || !hostname || !password || selectedPlanUnavailable}
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
