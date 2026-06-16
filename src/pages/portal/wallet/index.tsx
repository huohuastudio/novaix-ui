import { useEffect, useState } from 'react'
import { Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getPortalProfile, getPortalTransactions } from '@/api'
import type { PortalPortalTransactionItem } from '@/api'
import { SimplePagination } from '@/components/simple-pagination'
import { useSiteName, useFormatAmount, useFormatDate } from '@/hooks/use-site-settings'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { txTypeMap } from '@/lib/order-constants'
import { RechargeDialog } from './recharge-dialog'

export default function PortalWallet() {
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()
  useDocumentTitle(`钱包 - ${siteName}`)

  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<PortalPortalTransactionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [rechargeOpen, setRechargeOpen] = useState(false)

  const loadBalance = () => {
    getPortalProfile().then(({ data: res }) => {
      setBalance(res?.data?.balance ?? 0)
    })
  }

  useEffect(() => {
    loadBalance()
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 加载数据
    setLoading(true)
    getPortalTransactions({ query: { page, page_size: pageSize } })
      .then(({ data: res }) => {
        setTransactions(res?.data?.items ?? [])
        setTotal(res?.data?.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">钱包</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看余额和交易记录</p>
      </div>

      {/* 余额卡片 */}
      <div className="rounded-2xl bg-background p-6 sm:p-8">
        {loading ? (
          <>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-40 mt-2" />
          </>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">账户余额</p>
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
                {formatAmount(balance ?? 0)}
              </p>
            </div>
            <Button onClick={() => setRechargeOpen(true)}>
              <Plus className="size-4" />
              充值
            </Button>
          </div>
        )}
      </div>

      <RechargeDialog
        open={rechargeOpen}
        onOpenChange={setRechargeOpen}
        onSuccess={() => {
          loadBalance()
          setPage(1)
        }}
      />

      {/* 交易记录 */}
      <div className="space-y-4">
        <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">交易记录</h2>
        {loading ? (
          <div className="rounded-2xl bg-background divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-5 flex justify-between">
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20 mt-1" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="size-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-medium">暂无交易记录</h3>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-background divide-y divide-border/50">
              {transactions.map((tx) => {
                const isIncome = tx.type === 'recharge' || tx.type === 'refund'
                const Icon = tx.type === 'admin' ? RefreshCw : isIncome ? ArrowDownRight : ArrowUpRight
                return (
                  <div key={tx.id} className="flex items-center gap-4 p-5 first:rounded-t-2xl last:rounded-b-2xl">
                    <div className={`flex size-9 items-center justify-center rounded-lg ${isIncome ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-zinc-100 dark:bg-zinc-800/50'}`}>
                      <Icon className={`size-[18px] ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {txTypeMap[tx.type ?? '']?.label ?? tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(tx.created_at ?? '')}
                        {tx.remark && ` · ${tx.remark}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {isIncome ? '+' : '-'}{formatAmount(Math.abs(tx.amount ?? 0))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        余额 {formatAmount(tx.balance ?? 0)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <SimplePagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
