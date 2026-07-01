import { client } from '@/api/client.gen'
import { toast } from 'sonner'
import { getLoginPath, clearAuth, isImpersonating, setRequire2FASetup } from '@/lib/auth'
import { setMaintenanceState } from '@/hooks/use-maintenance'

const ERR_FEATURE_NOT_AVAILABLE = 10470
const ERR_NODE_QUOTA_EXCEEDED = 10471
const ERR_ADMIN_2FA_REQUIRED = 21004

client.setConfig({ throwOnError: true })

client.instance.interceptors.request.use((config) => {
  const token = isImpersonating()
    ? sessionStorage.getItem('token')
    : localStorage.getItem('token')
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

client.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''
    if (status === 401 && !url.endsWith('/login') && !url.includes('/auth/impersonate')) {
      clearAuth()
      window.location.href = getLoginPath()
    }
    if (status === 403) {
      const code = error.response?.data?.code as number | undefined
      const message = error.response?.data?.message as string | undefined
      if (code === ERR_FEATURE_NOT_AVAILABLE || code === ERR_NODE_QUOTA_EXCEEDED) {
        toast.error(message || '此功能仅限授权版使用，请先激活授权', { id: 'feature-gate' })
      } else if (code === ERR_ADMIN_2FA_REQUIRED) {
        setRequire2FASetup(true)
        toast.error('系统要求管理员开启二次验证，请先前往个人资料页面设置', { id: 'admin-2fa-required', duration: 6000 })
      } else {
        toast.error('权限不足，无法执行此操作')
      }
    }
    if (status === 503) {
      const msg = error.response?.data?.message || '系统维护中，请稍后再试'
      setMaintenanceState(true, msg)
    }
    return Promise.reject(error)
  },
)
