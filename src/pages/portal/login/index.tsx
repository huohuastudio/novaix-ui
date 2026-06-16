import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TOTPInput } from '@/components/totp-input'
import { useLoginForm } from '@/hooks/use-login-form'
import { useSiteSettings } from '@/hooks/use-site-settings'
import { useCaptcha } from '@/hooks/use-captcha'
import { CaptchaWidget } from '@/components/captcha-widget'
import { SocialLoginButtons } from '@/components/social-login-buttons'
import { useDocumentTitle } from '@uidotdev/usehooks'

export default function PortalLogin() {
  const { site_name: siteName, site_logo: logo, tos_url: tosUrl, privacy_url: privacyUrl, registration_enabled } = useSiteSettings()
  const form = useLoginForm('/portal')
  const captcha = useCaptcha('login')
  useDocumentTitle(`登录 - ${siteName}`)

  const handleCaptchaSuccess = (token: string) => {
    captcha.setToken(token)
    form.setCaptchaToken(token)
  }

  const handleCaptchaExpired = () => {
    captcha.reset()
    form.setCaptchaToken(null)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt={siteName} className="h-8 mx-auto mb-3" />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{siteName}</h1>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {form.requireTOTP ? '请输入验证器 App 中的验证码' : '登录您的账户以继续'}
          </p>
        </div>

        <div>
          {form.requireTOTP ? (
            <form onSubmit={form.handleSubmit} className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Label>二次验证码</Label>
                <TOTPInput value={form.totpCode} onChange={form.setTotpCode} autoFocus />
              </div>
              {form.error && (
                <p className="text-sm text-destructive text-center">{form.error}</p>
              )}
              <Button type="submit" className="w-full" disabled={form.loading || form.totpCode.length !== 6}>
                {form.loading ? '验证中...' : '验证'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={form.resetTOTP}>
                <ArrowLeft className="size-4" />
                返回登录
              </Button>
            </form>
          ) : (
            <form onSubmit={form.handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">账号</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => form.setUsername(e.target.value)}
                  placeholder="用户名 / 邮箱 / 手机号"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => form.setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </div>
              {captcha.required && (
                <CaptchaWidget onSuccess={handleCaptchaSuccess} onExpired={handleCaptchaExpired} />
              )}
              {form.error && (
                <p className="text-sm text-destructive">{form.error}</p>
              )}
              <Button type="submit" className="w-full" disabled={form.loading || (captcha.required && !captcha.token)}>
                {form.loading ? '登录中...' : '登录'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Link to="/reset-password" className="text-muted-foreground hover:text-foreground transition-colors">
                  忘记密码？
                </Link>
                {registration_enabled === "true" && (
                  <Link to="/register" className="text-primary hover:underline">
                    注册账户
                  </Link>
                )}
              </div>
            </form>
          )}

          {!form.requireTOTP && <SocialLoginButtons />}
        </div>

        {(tosUrl || privacyUrl) && (
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            {tosUrl && <a href={tosUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">服务条款</a>}
            {tosUrl && privacyUrl && <span>·</span>}
            {privacyUrl && <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">隐私政策</a>}
          </div>
        )}
      </div>
    </div>
  )
}
