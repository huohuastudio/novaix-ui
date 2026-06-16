import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, clearAuth } from '@/lib/auth'
import { getErrorMessage } from '@/lib/utils'

export function useLoginForm(redirectPath: string, requiredRole?: string) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [requireTOTP, setRequireTOTP] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(username, password, requireTOTP ? totpCode : undefined, captchaToken ?? undefined)
      if (result.requireTOTP) {
        setRequireTOTP(true)
        setTotpCode('')
        if (result.captchaPass) setCaptchaToken(result.captchaPass)
      } else {
        if (requiredRole && result.user.role !== requiredRole) {
          clearAuth()
          setError('该账户无权访问此页面')
          return
        }
        navigate(redirectPath)
      }
    } catch (err) {
      setError(getErrorMessage(err, '登录失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  function resetTOTP() {
    setRequireTOTP(false)
    setTotpCode('')
    setPassword('')
    setError('')
  }

  return {
    username, setUsername,
    password, setPassword,
    totpCode, setTotpCode,
    captchaToken, setCaptchaToken,
    requireTOTP, error, loading,
    handleSubmit, resetTOTP,
  }
}
