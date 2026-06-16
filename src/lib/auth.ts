import { postLogin } from '@/api'
import type { AuthUserInfo } from '@/api'
import { getAdminBasePath } from '@/hooks/use-site-settings'

export type { AuthUserInfo }

const IMPERSONATING_KEY = 'impersonating'

export function getLoginPath() {
  return window.location.pathname.startsWith('/portal') ? '/login' : `${getAdminBasePath()}/login`
}

export function isImpersonating(): boolean {
  return sessionStorage.getItem(IMPERSONATING_KEY) === '1'
}

export function clearAuth() {
  if (isImpersonating()) {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    return
  }
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function setImpersonateAuth(token: string, user: AuthUserInfo) {
  sessionStorage.setItem(IMPERSONATING_KEY, '1')
  sessionStorage.setItem('token', token)
  sessionStorage.setItem('user', JSON.stringify(user))
}

function clearImpersonateState() {
  sessionStorage.removeItem(IMPERSONATING_KEY)
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
}

export type LoginResult =
  | { requireTOTP: true; captchaPass?: string }
  | { requireTOTP: false; user: AuthUserInfo; require2FASetup?: boolean }

export async function login(username: string, password: string, totpCode?: string, captchaToken?: string): Promise<LoginResult> {
  const { data } = await postLogin({
    body: {
      username,
      password,
      ...(totpCode ? { totp_code: totpCode } : {}),
      ...(captchaToken ? { captcha_token: captchaToken } : {}),
    },
  })
  const loginData = data?.data
  if (loginData?.require_totp) {
    return { requireTOTP: true, captchaPass: loginData.captcha_pass as string | undefined }
  }
  if (!loginData?.token || !loginData.user) {
    throw new Error('登录失败')
  }
  clearImpersonateState()
  localStorage.setItem('token', loginData.token)
  localStorage.setItem('user', JSON.stringify(loginData.user))
  setRequire2FASetup(!!loginData.require_2fa_setup)
  return { requireTOTP: false, user: loginData.user, require2FASetup: loginData.require_2fa_setup }
}

export function setToken(token: string) {
  clearImpersonateState()
  localStorage.setItem('token', token)
}

export function setUser(user: AuthUserInfo) {
  localStorage.setItem('user', JSON.stringify(user))
}

export function logout() {
  if (isImpersonating()) {
    clearImpersonateState()
    window.close()
    return
  }
  const loginPath = getLoginPath()
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = loginPath
}

export function getUser(): AuthUserInfo | null {
  const raw = isImpersonating()
    ? sessionStorage.getItem('user')
    : localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  if (isImpersonating()) {
    return !!sessionStorage.getItem('token')
  }
  return !!localStorage.getItem('token')
}

export function requires2FASetup(): boolean {
  return localStorage.getItem('require_2fa_setup') === 'true'
}

export function setRequire2FASetup(required: boolean) {
  if (required) {
    localStorage.setItem('require_2fa_setup', 'true')
  } else {
    localStorage.removeItem('require_2fa_setup')
  }
}
