import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useLocalStorage } from "@uidotdev/usehooks"
import {
  Server,
  ImageIcon,
  Package,
  CreditCard,
  Check,
  ChevronRight,
  ChevronDown,
  Rocket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminPath } from "@/hooks/use-site-settings"
import {
  getAdminNodes,
  getAdminImages,
  getAdminPlans,
  getAdminProvidersByKind,
  getAdminSettingsByGroup,
} from "@/api"

interface SetupStep {
  key: string
  label: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  done: boolean
}

async function checkPaymentEnabled(): Promise<boolean> {
  try {
    const { data: res } = await getAdminProvidersByKind({ path: { kind: "payment" } })
    const providers = (res?.data ?? []).filter((d) => !d.plugin)
    if (providers.length === 0) return false

    const results = await Promise.all(
      providers.map((p) =>
        getAdminSettingsByGroup({ path: { group: `payment_${p.name}` } }).then(
          (r) => r.data?.data?.[`payment_${p.name}_enabled`] === "true",
          () => false,
        ),
      ),
    )
    return results.some(Boolean)
  } catch {
    return false
  }
}

function useSetupStatus() {
  const [steps, setSteps] = useState<SetupStep[] | null>(null)
  const adminPath = useAdminPath()

  useEffect(() => {
    let cancelled = false

    async function check() {
      const [hasOnlineNode, hasReadyImage, hasActivePlan, hasPayment] = await Promise.all([
        getAdminNodes({ query: { page: 1, page_size: 1, status: 1 } }).then(
          (r) => (r.data?.data?.total ?? 0) > 0,
          () => false,
        ),
        getAdminImages({ query: { page: 1, page_size: 50, status: 1 } }).then(
          (r) =>
            (r.data?.data?.items ?? []).some((img) => {
              const ds = img.download_status as string | undefined
              return !ds || ds === "completed"
            }),
          () => false,
        ),
        getAdminPlans({ query: { page: 1, page_size: 1, status: 1 } }).then(
          (r) => (r.data?.data?.total ?? 0) > 0,
          () => false,
        ),
        checkPaymentEnabled(),
      ])
      if (cancelled) return

      setSteps([
        {
          key: "node",
          label: "添加并初始化节点",
          description: "添加计算节点，完成初始化使其上线",
          href: `${adminPath}/nodes`,
          icon: Server,
          done: hasOnlineNode,
        },
        {
          key: "image",
          label: "添加可用镜像",
          description: "添加操作系统镜像并确保文件就绪，然后分发到节点",
          href: `${adminPath}/images`,
          icon: ImageIcon,
          done: hasReadyImage,
        },
        {
          key: "plan",
          label: "创建并上架套餐",
          description: "设定资源配置与定价，绑定节点组后上架",
          href: `${adminPath}/plans`,
          icon: Package,
          done: hasActivePlan,
        },
        {
          key: "payment",
          label: "配置支付渠道",
          description: "启用至少一个支付方式，用户才能完成付款",
          href: `${adminPath}/settings/payment`,
          icon: CreditCard,
          done: hasPayment,
        },
      ])
    }

    check()
    return () => {
      cancelled = true
    }
  }, [adminPath])

  return steps
}

export function SetupGuide() {
  const adminPath = useAdminPath()
  const storageKey = `novaix-setup-collapsed:${adminPath}`
  const [collapsed, setCollapsed] = useLocalStorage(storageKey, false)
  const steps = useSetupStatus()

  const allDone = steps ? steps.every((s) => s.done) : false

  if (allDone) return null

  if (!collapsed && !steps) {
    return (
      <div className="rounded-md border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={() => setCollapsed(true)}
            aria-label="折叠引导"
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => setCollapsed(false)}
      >
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Rocket className="size-3.5 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground">快速开始引导</span>
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </button>
    )
  }

  // 走到此处 collapsed=false 且 steps 非 null（行 138 已过滤 null）
  const resolvedSteps = steps!
  const completedCount = resolvedSteps.filter((s) => s.done).length
  const currentIndex = resolvedSteps.findIndex((s) => !s.done)

  return (
    <div className="rounded-md border p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Rocket className="size-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">快速开始</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              完成以下步骤即可开始售卖 · {completedCount}/{resolvedSteps.length}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={() => setCollapsed(true)}
          aria-label="折叠引导"
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / resolvedSteps.length) * 100}%` }}
        />
      </div>

      <div className="mt-4 space-y-1.5">
        {resolvedSteps.map((step, index) => {
          const isCurrent = index === currentIndex
          const StepIcon = step.icon
          return (
            <Link
              key={step.key}
              to={step.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${
                step.done
                  ? "opacity-60"
                  : isCurrent
                    ? "bg-muted/50 ring-1 ring-border"
                    : "hover:bg-muted/30"
              }`}
            >
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  step.done
                    ? "bg-emerald-100 dark:bg-emerald-950/40"
                    : isCurrent
                      ? "bg-primary/10"
                      : "bg-muted"
                }`}
              >
                {step.done ? (
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <StepIcon
                    className={`size-3.5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${step.done ? "line-through text-muted-foreground" : "font-medium"}`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
              {!step.done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
            </Link>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        全部完成后，建议以用户视角走一遍购买流程确认一切正常
      </p>
    </div>
  )
}
