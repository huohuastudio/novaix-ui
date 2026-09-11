import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'

import {
  getPortalPushTransfersInviteByToken,
  postPortalPushTransfersInviteByTokenAccept,
} from '@/api'
import type {
  PortalPushTransferResponse,
  PortalPushTransferInstanceInfo,
} from '@/api'
import { getPortalPushTransfersInviteByTokenQueryKey } from '@/api/@tanstack/react-query.gen'

import { useSiteName, useFormatAmount, useFormatDate } from '@/hooks/use-site-settings'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { billingCycleMap } from '@/lib/order-constants'
import { getErrorMessage } from '@/lib/utils'

const feePayerMap: Record<string, string> = {
  none: '无',
  sender: '转出方',
  receiver: '接收方',
}

export default function TransferInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const siteName = useSiteName()
  const formatAmount = useFormatAmount()
  const formatDate = useFormatDate()

  useDocumentTitle(`接收实例转移 - ${siteName}`)

  const [accepting, setAccepting] = useState(false)

  const query = useQuery({
    queryKey: getPortalPushTransfersInviteByTokenQueryKey({ path: { token: token! } }),
    queryFn: async () => {
      const res = await getPortalPushTransfersInviteByToken({ path: { token: token! } })
      const body = res.data as { code?: number; data?: { transfer?: PortalPushTransferResponse; instance?: PortalPushTransferInstanceInfo } }
      if (body?.data?.transfer && body?.data?.instance) {
        return { transfer: body.data.transfer, instance: body.data.instance }
      }
      throw new Error('转移记录不存在或已失效')
    },
    enabled: !!token,
    retry: false,
  })

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      const res = await postPortalPushTransfersInviteByTokenAccept({ path: { token } })
      const body = res.data as { code?: number; message?: string }
      if (body?.code === 22813) {
        toast.success('已提交，等待管理员审批')
      } else {
        toast.success('实例已成功接收')
      }
      navigate('/portal/servers')
    } catch (err) {
      toast.error(getErrorMessage(err, '接收失败'))
    } finally {
      setAccepting(false)
    }
  }

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-full max-w-lg space-y-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <div className="rounded-xl border p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </div>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-full max-w-lg text-center space-y-4">
          <h2 className="text-xl font-semibold">无法查看转移信息</h2>
          <p className="text-sm text-muted-foreground">
            {query.error ? getErrorMessage(query.error, '该邀请链接无效或已过期') : '该邀请链接无效或已过期'}
          </p>
          <Button variant="outline" onClick={() => navigate('/portal/transfers')}>
            返回转移列表
          </Button>
        </div>
      </div>
    )
  }

  const { transfer, instance } = query.data

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">您收到一个实例转移邀请</h2>
          <p className="mt-1 text-sm text-muted-foreground">请确认以下实例信息后决定是否接收</p>
        </div>

        <div className="rounded-xl border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{instance.name}</h3>
            <Badge variant="outline">{instance.status === 'running' ? '运行中' : instance.status === 'stopped' ? '已停止' : instance.status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">IP 地址</span>
              <p className="font-mono mt-0.5">{instance.ip_address || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">配置</span>
              <p className="mt-0.5">{instance.cpu} 核 / {instance.memory} MB / {instance.disk} GB</p>
            </div>
            <div>
              <span className="text-muted-foreground">计费周期</span>
              <p className="mt-0.5">{billingCycleMap[instance.billing_cycle ?? ''] ?? instance.billing_cycle}</p>
            </div>
            <div>
              <span className="text-muted-foreground">到期时间</span>
              <p className="mt-0.5">{instance.expire_at ? formatDate(instance.expire_at) : '-'}</p>
            </div>
          </div>

          {(transfer.fee_amount ?? 0) > 0 && transfer.fee_payer === 'receiver' && (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">手续费：</span>
              <span className="font-medium">{formatAmount(transfer.fee_amount ?? 0)}</span>
              <span className="text-muted-foreground">（{feePayerMap[transfer.fee_payer ?? ''] ?? transfer.fee_payer}承担）</span>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            接收后，您将成为该实例的所有者，需承担后续的续费责任。
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/portal/transfers')}
            >
              暂不接收
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting && <Loader2 className="size-4 animate-spin" />}
              确认接收
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            邀请有效期至 {formatDate(transfer.expires_at ?? '')}
          </p>
        </div>
      </div>
    </div>
  )
}
