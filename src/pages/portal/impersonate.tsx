import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { postAuthImpersonate } from '@/api'
import { setImpersonateAuth } from '@/lib/auth'

export default function Impersonate() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const ticket = searchParams.get('ticket')
    if (!ticket) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载时数据获取
      setError('缺少登录凭证')
      return
    }

    postAuthImpersonate({ body: { ticket } })
      .then(({ data: res }) => {
        if (res?.code === 0 && res.data?.token && res.data.user) {
          setImpersonateAuth(res.data.token, res.data.user)
          navigate('/portal', { replace: true })
        } else {
          setError(res?.message || '登录凭证无效或已过期')
        }
      })
      .catch(() => {
        setError('登录凭证无效或已过期')
      })
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
