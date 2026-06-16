import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getPortalKyc, postPortalKycVerify } from '@/api'
import type { ServiceKycStatus } from '@/api'
import { getErrorMessage } from '@/lib/utils'
import { useFormatDate } from '@/hooks/use-site-settings'
import { toast } from 'sonner'

export function KYCSection() {
  const formatDate = useFormatDate()
  const [status, setStatus] = useState<ServiceKycStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [realName, setRealName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const { data: res } = await getPortalKyc()
      setStatus(res?.data ?? null)
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
    void fetchStatus()
  }, [fetchStatus])

  const handleVerify = async () => {
    if (!realName.trim() || !idNumber.trim()) {
      toast.error('请填写姓名和身份证号')
      return
    }
    setSubmitting(true)
    try {
      await postPortalKycVerify({
        body: { real_name: realName.trim(), id_number: idNumber.trim() },
      })
      toast.success('实名认证成功')
      setRealName('')
      setIdNumber('')
      fetchStatus()
    } catch (err) {
      toast.error(getErrorMessage(err, '认证失败'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-48 mt-1.5" />
          </div>
        </div>
      </>
    )
  }

  const isVerified = status?.status === 'verified'

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">实名认证</h3>
          <p className="text-xs text-muted-foreground mt-1">
            验证您的身份信息
          </p>
        </div>
        {isVerified && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-3.5" />
            已认证
          </span>
        )}
      </div>

      {isVerified ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <Label className="text-muted-foreground text-xs">姓名</Label>
            <p className="text-sm font-medium mt-1">{status?.real_name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">身份证号</Label>
            <p className="text-sm font-medium mt-1 font-mono">{status?.id_number}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">认证时间</Label>
            <p className="text-sm font-medium mt-1">{formatDate(status?.verified_at ?? '')}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kyc-name">真实姓名</Label>
            <Input
              id="kyc-name"
              placeholder="请输入身份证上的姓名"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kyc-id">身份证号</Label>
            <Input
              id="kyc-id"
              placeholder="请输入 18 位身份证号"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              maxLength={18}
            />
          </div>
          <Button
            onClick={handleVerify}
            disabled={submitting || !realName.trim() || !idNumber.trim()}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            提交认证
          </Button>
        </div>
      )}
    </>
  )
}
