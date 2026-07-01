import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getPortalKyc, postPortalKycVerify, postPortalKycFaceInit, postPortalKycFaceResult } from '@/api'
import type { ServiceKycStatus } from '@/api'
import { getErrorMessage } from '@/lib/utils'
import { useFormatDate } from '@/hooks/use-site-settings'
import { useSiteSettings } from '@/hooks/use-site-settings'
import { toast } from 'sonner'

export function KYCSection() {
  const formatDate = useFormatDate()
  const { kyc_mode } = useSiteSettings()
  const [status, setStatus] = useState<ServiceKycStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [realName, setRealName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [kycToken] = useState(() => new URLSearchParams(window.location.search).get('kyc_token'))
  const [querying, setQuerying] = useState(() => !!kycToken)

  const refreshStatus = async () => {
    const { data: res } = await getPortalKyc()
    setStatus(res?.data ?? null)
  }

  useEffect(() => {
    getPortalKyc()
      .then(({ data: res }) => setStatus(res?.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))

    if (kycToken) {
      window.history.replaceState({}, '', window.location.pathname)
      postPortalKycFaceResult({ body: { kyc_token: kycToken } })
        .then(() => {
          toast.success('人脸识别认证成功')
          return refreshStatus()
        })
        .catch((err) => toast.error(getErrorMessage(err, '人脸识别认证失败')))
        .finally(() => setQuerying(false))
    }
  }, [kycToken])

  const handleTwoFactorVerify = async () => {
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
      refreshStatus()
    } catch (err) {
      toast.error(getErrorMessage(err, '认证失败'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleFaceVerify = async () => {
    if (!realName.trim() || !idNumber.trim()) {
      toast.error('请填写姓名和身份证号')
      return
    }
    setSubmitting(true)
    try {
      const { data: res } = await postPortalKycFaceInit({
        body: { real_name: realName.trim(), id_number: idNumber.trim() },
      })
      const faceUrl = res?.data?.face_url
      if (faceUrl) {
        window.location.href = faceUrl
      } else {
        toast.error('人脸识别初始化异常，请稍后重试')
        setSubmitting(false)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, '发起人脸识别失败'))
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

  if (querying) {
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">实名认证</h3>
            <p className="text-xs text-muted-foreground mt-1">
              正在查询人脸识别结果...
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在验证人脸识别结果，请稍候
        </div>
      </>
    )
  }

  const isVerified = status?.status === 'verified'
  const isFaceMode = kyc_mode === 'face'

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
            onClick={isFaceMode ? handleFaceVerify : handleTwoFactorVerify}
            disabled={submitting || !realName.trim() || !idNumber.trim()}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isFaceMode ? '开始人脸识别' : '提交认证'}
          </Button>
          {isFaceMode && (
            <p className="text-xs text-muted-foreground">
              点击后将跳转至第三方页面完成人脸识别，验证通过后自动返回
            </p>
          )}
        </div>
      )}
    </>
  )
}
