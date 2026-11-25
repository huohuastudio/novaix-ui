import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Cpu, HardDrive, MemoryStick, Globe, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FieldGrid } from '@/components/provider-settings-form'
import { PortalPurchaseSwitch } from '@/components/portal-purchase-switch'
import { postPortalModuleOrders } from '@/api'
import type { ServicePortalModuleProduct } from '@/api'
import {
  getPortalModuleProductsOptions,
  getPortalOrdersQueryKey,
} from '@/api/@tanstack/react-query.gen'
import { useSiteName, useFormatAmount } from '@/hooks/use-site-settings'
import { usePortalBusinessMode } from '@/hooks/use-portal-business-mode'
import { formatMemory, getErrorMessage } from '@/lib/utils'
import { collectDynamicValues, dynamicFieldValues, validateDynamicFields } from '@/lib/supplier-constants'
import { billingCycleMap } from '@/lib/order-constants'
import { serviceBillingCycles, type ServiceBillingCycle } from '@/lib/service-constants'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'

// 未设置分类的商品归入"其他"
const OTHER_CATEGORY = ''

function categoryOf(p: ServicePortalModuleProduct): string {
  return p.category?.trim() || OTHER_CATEGORY
}

function productCycles(p: ServicePortalModuleProduct): ServiceBillingCycle[] {
  const enabled = p.enabled_cycles ?? []
  return serviceBillingCycles.filter((c) => enabled.includes(c))
}

function getProductPrice(p: ServicePortalModuleProduct, cycle: ServiceBillingCycle): number {
  switch (cycle) {
    case 'monthly': return p.price_monthly ?? 0
    case 'quarterly': return p.price_quarterly ?? 0
    case 'yearly': return p.price_yearly ?? 0
  }
}

export default function PortalModulePurchase() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { shop: purchasable } = usePortalBusinessMode()
  useDocumentTitle(`选购服务 - ${siteName}`)

  const [userCategory, setUserCategory] = useState<string | null>(null)
  const [userProductId, setUserProductId] = useState<number | null>(null)
  const [userCycle, setUserCycle] = useState<ServiceBillingCycle | null>(null)
  const [name, setName] = useState('')
  // 下单字段按商品隔离：切换商品后自动回到该商品字段的默认值
  const [checkout, setCheckout] = useState<{ productId: number | null; values: Record<string, string> }>({ productId: null, values: {} })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const productsQuery = useQuery({
    ...getPortalModuleProductsOptions(),
    enabled: purchasable,
  })
  const allProducts = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data])
  const loading = purchasable && productsQuery.isPending

  // 分类列表（保持商品顺序），无分类的商品放在最后
  const categories = useMemo(() => {
    const list: string[] = []
    for (const p of allProducts) {
      const c = categoryOf(p)
      if (!list.includes(c)) list.push(c)
    }
    return list.sort((a, b) => (a === OTHER_CATEGORY ? 1 : 0) - (b === OTHER_CATEGORY ? 1 : 0))
  }, [allProducts])
  // 全部商品都未分类时不显示分类选择
  const showCategories = categories.some((c) => c !== OTHER_CATEGORY)

  const categoryAvailable = useMemo(() => {
    const set = new Set<string>()
    for (const p of allProducts) {
      if (p.in_stock) set.add(categoryOf(p))
    }
    return set
  }, [allProducts])

  const selectedCategory = userCategory !== null && categories.includes(userCategory)
    ? userCategory
    : categories.find((c) => categoryAvailable.has(c)) ?? categories[0] ?? OTHER_CATEGORY

  const products = useMemo(
    () => (showCategories ? allProducts.filter((p) => categoryOf(p) === selectedCategory) : allProducts),
    [allProducts, showCategories, selectedCategory],
  )

  const selectedProduct = useMemo(() => {
    const available = (p: ServicePortalModuleProduct) => !!p.in_stock && productCycles(p).length > 0
    const chosen = products.find((p) => p.id === userProductId)
    if (chosen && available(chosen)) return chosen
    return products.find(available) ?? null
  }, [products, userProductId])
  const selectedProductId = selectedProduct?.id ?? null

  const cycles = selectedProduct ? productCycles(selectedProduct) : []
  const selectedCycle: ServiceBillingCycle | null = userCycle && cycles.includes(userCycle)
    ? userCycle
    : cycles[0] ?? null
  const price = selectedProduct && selectedCycle ? getProductPrice(selectedProduct, selectedCycle) : 0

  const fields = useMemo(() => selectedProduct?.checkout_fields ?? [], [selectedProduct])
  const checkoutValues = useMemo(
    () => (checkout.productId === selectedProductId ? checkout.values : {}),
    [checkout, selectedProductId],
  )
  // 合并字段默认值，供条件显示与提交使用
  const fieldValues = useMemo(() => dynamicFieldValues(fields, checkoutValues), [fields, checkoutValues])

  const selectCategory = (category: string) => {
    setUserCategory(category)
    setUserProductId(null)
    setErrors({})
  }

  const selectProduct = (product: ServicePortalModuleProduct) => {
    setUserProductId(product.id ?? null)
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!selectedProduct?.id || !selectedCycle) {
      toast.error('请选择商品和计费周期')
      return
    }
    const nextErrors = validateDynamicFields(fields, checkoutValues)
    const input = collectDynamicValues(fields, checkoutValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('请完善下单信息')
      return
    }
    setSubmitting(true)
    try {
      const { data: res } = await postPortalModuleOrders({
        body: {
          product_id: selectedProduct.id,
          billing_cycle: selectedCycle,
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(Object.keys(input).length > 0 ? { checkout: input } : {}),
        },
      })
      if (res?.code === 0 && res.data?.id) {
        // 与云服务器选购保持一致：创建订单后前往订单详情支付
        queryClient.invalidateQueries({ queryKey: getPortalOrdersQueryKey() })
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">选购服务</h1>
        <p className="mt-1 text-sm text-muted-foreground">选择商品，开通您需要的服务</p>
      </div>
      <PortalPurchaseSwitch active="services" />
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-8">
        {pageHeader}
        <div className="space-y-4">
          <Skeleton className="h-3.5 w-16" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-24 rounded-xl" />
            ))}
          </div>
        </div>
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

  if (!purchasable || allProducts.length === 0) {
    return (
      <div className="space-y-8">
        {pageHeader}
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-background">
          <Package className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">暂无可选购的商品</p>
          <p className="text-xs text-muted-foreground mt-1">商品尚未上架，请稍后再来</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {pageHeader}

      {/* 选择分类 */}
      {showCategories && (
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">选择分类</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = category === selectedCategory
              const unavailable = !categoryAvailable.has(category)
              return (
                <button
                  key={category || '__other__'}
                  onClick={() => selectCategory(category)}
                  className={`rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                    unavailable
                      ? 'bg-background opacity-50'
                      : active
                        ? 'bg-foreground text-background'
                        : 'bg-background hover:bg-foreground/[.05]'
                  }`}
                >
                  {category || '其他'}
                  {unavailable && (
                    <span className="block text-xs font-normal mt-0.5 text-muted-foreground">暂无可用商品</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 选择商品 */}
      <div className="space-y-4">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">选择商品</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((product) => {
            const active = product.id === selectedProductId
            const cyclesOfProduct = productCycles(product)
            const disabled = !product.in_stock || cyclesOfProduct.length === 0
            // 当前周期不适用于该商品时展示其首个可用周期的价格
            const displayCycle = selectedCycle && cyclesOfProduct.includes(selectedCycle)
              ? selectedCycle
              : cyclesOfProduct[0]
            const hasSpec = (product.cpu ?? 0) > 0 || (product.memory ?? 0) > 0 || (product.disk ?? 0) > 0
            return (
              <button
                key={product.id}
                disabled={disabled}
                onClick={() => selectProduct(product)}
                className={`relative min-w-0 rounded-2xl p-5 text-left transition-colors ${
                  disabled
                    ? 'bg-background opacity-50 cursor-not-allowed'
                    : active
                      ? 'bg-foreground/5 ring-2 ring-foreground/20'
                      : 'bg-background hover:bg-foreground/[.05]'
                }`}
              >
                {disabled && (
                  <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
                    售罄
                  </span>
                )}
                {!disabled && active && (
                  <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-foreground">
                    <Check className="size-3 text-background" />
                  </div>
                )}
                <h3 className="text-sm font-semibold pr-10 wrap-anywhere">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-muted-foreground mt-1 wrap-anywhere">{product.description}</p>
                )}
                {hasSpec && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-muted-foreground">
                    {(product.cpu ?? 0) > 0 && <span className="inline-flex items-center gap-1"><Cpu className="size-3" />{product.cpu} vCPU</span>}
                    {(product.memory ?? 0) > 0 && <span className="inline-flex items-center gap-1"><MemoryStick className="size-3" />{formatMemory(product.memory ?? 0)}</span>}
                    {(product.disk ?? 0) > 0 && <span className="inline-flex items-center gap-1"><HardDrive className="size-3" />{product.disk} GB</span>}
                  </div>
                )}
                {((product.bandwidth ?? 0) > 0 || (product.traffic ?? 0) > 0) && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    <Globe className="size-3" />
                    {[
                      (product.bandwidth ?? 0) > 0 ? `${product.bandwidth} Mbps` : '',
                      (product.traffic ?? 0) > 0 ? `${product.traffic} GB` : '',
                    ].filter(Boolean).join(' / ')}
                  </div>
                )}
                {product.region && product.region !== categoryOf(product) && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="rounded bg-muted px-1.5 py-0.5">{product.region}</span>
                  </div>
                )}
                {displayCycle && (
                  <p className="text-lg font-semibold mt-3">
                    {formatAmount(getProductPrice(product, displayCycle))}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      /{billingCycleMap[displayCycle] ?? displayCycle}
                    </span>
                  </p>
                )}
                {product.require_kyc && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">需要实名认证</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 计费周期：没有可选商品时不展示空标题 */}
      {selectedProduct && cycles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">计费周期</h2>
          <div className="flex flex-wrap gap-2">
            {cycles.map((cycle) => {
              const active = cycle === selectedCycle
              return (
                <button
                  key={cycle}
                  onClick={() => setUserCycle(cycle)}
                  className={`rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-foreground text-background'
                      : 'bg-background hover:bg-foreground/[.05]'
                  }`}
                >
                  {billingCycleMap[cycle]}
                  <span className={`block text-xs font-normal mt-0.5 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
                    {formatAmount(getProductPrice(selectedProduct, cycle))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 下单信息：服务名称 + 商品要求填写的字段 */}
      {selectedProduct && (
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">基本配置</h2>
          <div className="rounded-2xl bg-background p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
              <div className="space-y-2">
                <Label htmlFor="service-name">服务名称</Label>
                <Input
                  id="service-name"
                  placeholder={selectedProduct.name || '选填'}
                  value={name}
                  maxLength={64}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">选填，便于在列表中区分，开通后可修改</p>
              </div>
            </div>
            {fields.length > 0 && (
              <div className="max-w-3xl">
                <FieldGrid
                  fields={fields}
                  fieldValues={fieldValues}
                  errors={errors}
                  getValue={(f) => fieldValues[f.key ?? ''] ?? ''}
                  onChange={(f, v) => {
                    if (!f.key) return
                    const key = f.key
                    setCheckout((prev) => ({
                      productId: selectedProductId,
                      values: { ...(prev.productId === selectedProductId ? prev.values : {}), [key]: v },
                    }))
                    setErrors((prev) => {
                      if (!prev[key]) return prev
                      const next = { ...prev }
                      delete next[key]
                      return next
                    })
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 确认下单 */}
      <div className="rounded-2xl bg-background p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {selectedProduct && selectedCycle
                ? <>{selectedProduct.name} · {billingCycleMap[selectedCycle]}</>
                : '当前分类暂无可购买的商品'}
            </p>
            <p className="text-2xl font-semibold mt-1">{formatAmount(price)}</p>
          </div>
          <Button
            size="lg"
            className="px-8"
            disabled={submitting || !selectedProduct || !selectedCycle}
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
