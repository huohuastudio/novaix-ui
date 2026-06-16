import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth'
import { getAdminPing, getPortalPing } from '@/api'

interface Props {
  children: React.ReactNode
  loginPath: string
  requiredRole?: string
}

export default function ProtectedRoute({ children, loginPath, requiredRole }: Props) {
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>(() => {
    if (!isAuthenticated()) return 'invalid'
    const user = getUser()
    if (requiredRole && user?.role !== requiredRole) return 'invalid'
    return 'checking'
  })

  useEffect(() => {
    if (status !== 'checking') return
    const ping = loginPath === '/login' ? getPortalPing : getAdminPing
    ping()
      .then(() => setStatus('valid'))
      .catch(() => {
        clearAuth()
        setStatus('invalid')
      })
  }, [status, loginPath])

  if (status === 'checking') return null
  if (status === 'invalid') return <Navigate to={loginPath} replace />

  return <>{children}</>
}
