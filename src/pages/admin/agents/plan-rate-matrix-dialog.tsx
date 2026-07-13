import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { putAdminAgentGroupsByIdRates } from "@/api"
import type { AgentGroupItem } from "@/api"
import {
  getAdminPlansOptions,
  getAdminAgentGroupsByIdRatesOptions,
  getAdminAgentGroupsByIdRatesQueryKey,
} from "@/api/@tanstack/react-query.gen"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SimplePagination } from "@/components/simple-pagination"
import { getErrorMessage, formatMemory, formatDisk } from "@/lib/utils"

const PAGE_SIZE = 20

interface PlanRow {
  id: number
  name: string
  spec: string
}

// 每个套餐的覆盖值，空字符串表示沿用分组默认
interface RowOverride {
  first: string
  recurring: string
  discount: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: AgentGroupItem
}

function emptyOverride(): RowOverride {
  return { first: "", recurring: "", discount: "" }
}

function toNum(v: string): number | undefined {
  if (v.trim() === "") return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export default function PlanRateMatrixDialog({ open, onOpenChange, group }: Props) {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [overrides, setOverrides] = useState<Record<number, RowOverride>>({})

  // 费率矩阵：对话框打开时才取数，group.id 经 options 进入 query key
  const ratesQuery = useQuery({
    ...getAdminAgentGroupsByIdRatesOptions({ path: { id: group.id! } }),
    enabled: open && !!group.id,
  })
  const ratesFailed = ratesQuery.isError

  // 套餐列表：等费率加载完成（成功或失败）后再取，保持原有的加载顺序
  const plansQuery = useQuery({
    ...getAdminPlansOptions({ query: { page, page_size: PAGE_SIZE } }),
    enabled: open && !ratesQuery.isPending,
  })
  const loading = plansQuery.isPending

  const plans = useMemo<PlanRow[]>(
    () =>
      (plansQuery.data?.data?.items ?? []).map((p) => ({
        id: p.id!,
        name: p.name ?? `套餐 ${p.id}`,
        spec: [`${p.cpu}C`, formatMemory(p.memory ?? 0), formatDisk(p.disk ?? 0)].join(" / "),
      })),
    [plansQuery.data]
  )
  const total = plansQuery.data?.data?.total ?? 0

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 对话框打开时重置分页
      setPage(1)
    }
  }, [open])

  // 服务器费率数据 → 本地编辑缓冲的同步（打开或数据更新时重建覆盖值）
  useEffect(() => {
    if (!open) return
    const map: Record<number, RowOverride> = {}
    for (const r of ratesQuery.data?.data ?? []) {
      if (r.plan_id == null) continue
      map[r.plan_id] = {
        first: r.commission_rate_first != null ? String(r.commission_rate_first) : "",
        recurring: r.commission_rate_recurring != null ? String(r.commission_rate_recurring) : "",
        discount: r.discount_rate != null ? String(r.discount_rate) : "",
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 服务器数据同步到编辑缓冲
    setOverrides(map)
  }, [open, ratesQuery.data])

  const setField = (planId: number, key: keyof RowOverride, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [planId]: { ...(prev[planId] ?? emptyOverride()), [key]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const rates = Object.entries(overrides)
        .map(([id, o]) => {
          const first = toNum(o.first)
          const recurring = toNum(o.recurring)
          const discount = toNum(o.discount)
          if (first === undefined && recurring === undefined && discount === undefined) return null
          return {
            plan_id: Number(id),
            commission_rate_first: first,
            commission_rate_recurring: recurring,
            discount_rate: discount,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)

      const { data: res } = await putAdminAgentGroupsByIdRates({
        path: { id: group.id! },
        body: { rates },
      })
      if (res?.code === 0) {
        toast.success("费率矩阵已保存")
        queryClient.invalidateQueries({
          queryKey: getAdminAgentGroupsByIdRatesQueryKey({ path: { id: group.id! } }),
        })
        onOpenChange(false)
      } else {
        toast.error(res?.message ?? "保存失败")
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "保存失败"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>套餐费率矩阵 · {group.name}</DialogTitle>
          <DialogDescription>
            为单个套餐覆盖该分组的默认比例，留空表示沿用分组默认（首单 {group.commission_rate_first ?? 0}% / 后续 {group.commission_rate_recurring ?? 0}% / 折扣 {group.discount_rate ?? 0}%）
          </DialogDescription>
        </DialogHeader>

        {ratesFailed && (
          <p className="text-sm text-destructive">
            {getErrorMessage(ratesQuery.error, "加载费率矩阵失败")}
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无套餐</p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">套餐</th>
                  <th className="w-24 py-2 px-1 font-medium">首单 %</th>
                  <th className="w-24 py-2 px-1 font-medium">后续 %</th>
                  <th className="w-24 py-2 px-1 font-medium">折扣 %</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const o = overrides[p.id] ?? emptyOverride()
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.spec}</div>
                      </td>
                      <td className="px-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={o.first}
                          placeholder="默认"
                          onChange={(e) => setField(p.id, "first", e.target.value)}
                        />
                      </td>
                      <td className="px-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={o.recurring}
                          placeholder="默认"
                          onChange={(e) => setField(p.id, "recurring", e.target.value)}
                        />
                      </td>
                      <td className="px-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={o.discount}
                          placeholder="默认"
                          onChange={(e) => setField(p.id, "discount", e.target.value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <SimplePagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading || ratesFailed}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
