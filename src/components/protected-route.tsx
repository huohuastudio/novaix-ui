import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth'
import { getAdminPing, getPortalPing } from '@/api'

interface Props {
  children: React.ReactNode
  loginPath: string
  requiredRole?: string
}

export default function ProtectedRoute({ children, loginPath, requiredRole }: Props) {
  const location = useLocation()
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
  if (status === 'invalid') {
    const currentPath = location.pathname + location.search
    const redirectTo = currentPath && currentPath !== '/' && currentPath !== loginPath
      ? `${loginPath}?redirect=${encodeURIComponent(currentPath)}`
      : loginPath
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
