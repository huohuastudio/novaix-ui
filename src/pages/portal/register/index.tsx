import { useState, useEffect, useCallback, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { useCaptcha } from "@/hooks/use-captcha"
import { CaptchaWidget } from "@/components/captcha-widget"
import { SocialLoginButtons } from "@/components/social-login-buttons"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { postRegister, postRegisterSendCode, getOauthPendingRegister } from "@/api"
import { setToken, setUser } from "@/lib/auth"
import { getErrorMessage } from "@/lib/utils"

export default function RegisterPage() {
  const { site_name: siteName, site_logo: logo, sms_enabled, registration_email_verify } = useSiteSettings()
  const smsEnabled = sms_enabled === "true"
  const emailVerifyEnabled = registration_email_verify !== "false"
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  useDocumentTitle(`注册 - ${siteName}`)

  const ref = searchParams.get('ref')
  const oauthToken = searchParams.get('oauth_token')
  const rawRedirect = searchParams.get('redirect')
  const oauthRedirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/portal"

  // OAuth 注册模式：预填社交账号信息
  const [oauthInfo, setOauthInfo] = useState<{ provider: string; email: string; email_verified: boolean; display_name: string } | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [method, setMethod] = useState<"email" | "phone">("email")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const sendCodeCaptcha = useCaptcha("send_code")
  const registerCaptcha = useCaptcha("register")

  useEffect(() => {
    if (!oauthToken) return
    void (async () => {
      try {
        const { data: res } = await getOauthPendingRegister({ query: { oauth_token: oauthToken } })
        if (res?.code === 0 && res.data) {
          const d = res.data as { provider: string; email: string; email_verified: boolean; display_name: string }
          setOauthInfo(d)
          if (d.display_name) setUsername(d.display_name)
          if (d.email && d.email_verified) setEmail(d.email)
        }
      } catch {
        toast.error("OAuth 信息已过期，请重新登录")
        navigate("/login", { replace: true })
      }
    })()
  }, [oauthToken, navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = useCallback(async () => {
    if (countdown > 0 || sendingCode) return
    setSendingCode(true)
    setError("")
    try {
      const captchaToken = sendCodeCaptcha.token
      const body = method === "phone"
        ? { phone, ...(captchaToken ? { captcha_token: captchaToken } : {}) }
        : { email, ...(captchaToken ? { captcha_token: captchaToken } : {}) }
      const { data: res } = await postRegisterSendCode({ body })
      if (res?.code === 0) {
        toast.success(method === "phone" ? "验证码已发送，请查收短信" : "验证码已发送，请查收邮箱")
        setCountdown(60)
        setStep(2)
      } else {
        setError(res?.message || "发送验证码失败")
      }
    } catch (err) {
      setError(getErrorMessage(err, "发送验证码失败"))
    } finally {
      setSendingCode(false)
      sendCodeCaptcha.reset()
    }
  }, [method, email, phone, countdown, sendingCode, sendCodeCaptcha])

  const needVerifyCode = method === "phone" || emailVerifyEnabled
  const needIdentityInput = !oauthInfo?.email_verified

  const submitRegister = async (verificationCode: string) => {
    setLoading(true)
    setError("")
    try {
      const identity = method === "phone" ? { phone } : { email }
      const { data: res } = await postRegister({
        body: {
          username,
          ...identity,
          password,
          code: verificationCode,
          ...(ref ? { ref: Number(ref) } : {}),
          ...(oauthToken ? { oauth_token: oauthToken } : {}),
          ...(registerCaptcha.token ? { captcha_token: registerCaptcha.token } : {}),
        },
      })
      if (res?.code === 0 && res.data) {
        const data = res.data as { token: string; user: { id: number; username: string; email: string; role: string } }
        setToken(data.token)
        setUser(data.user)
        toast.success("注册成功")
        navigate(oauthToken ? oauthRedirect : "/portal", { replace: true })
      } else {
        setError(res?.message || "注册失败")
      }
    } catch (err) {
      setError(getErrorMessage(err, "注册失败"))
    } finally {
      setLoading(false)
    }
  }

  const handleStep1 = (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (password && password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }
    // OAuth 模式下 provider 已验证邮箱：跳过验证码直接注册
    if (oauthInfo?.email_verified) {
      submitRegister("")
      return
    }
    // 其余情况（普通注册 / OAuth 无已验证邮箱）走统一流程
    if (needVerifyCode) {
      handleSendCode()
    } else {
      submitRegister("")
    }
  }

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault()
    await submitRegister(code)
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
            {oauthInfo ? `通过 ${oauthInfo.provider} 创建新账户` : step === 1 ? "创建新账户" : method === "phone" ? "输入短信验证码" : "输入邮箱验证码"}
          </p>
        </div>

        <div>
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="2-32 个字符"
                  required
                  autoFocus
                  minLength={2}
                  maxLength={32}
                />
              </div>
              {needIdentityInput && smsEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={method === "email" ? "default" : "outline"}
                    onClick={() => setMethod("email")}
                  >
                    邮箱注册
                  </Button>
                  <Button
                    type="button"
                    variant={method === "phone" ? "default" : "outline"}
                    onClick={() => setMethod("phone")}
                  >
                    手机号注册
                  </Button>
                </div>
              )}
              {needIdentityInput && (method === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
                    placeholder="请输入手机号"
                    required
                    inputMode="numeric"
                  />
                </div>
              ))}
              {!needIdentityInput && oauthInfo?.email && (
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" type="email" value={email} readOnly className="bg-muted" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">密码{oauthToken && <span className="text-muted-foreground font-normal">（可选）</span>}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={oauthToken ? "可选，不填将生成随机密码" : "至少 6 个字符"}
                  required={!oauthToken}
                  minLength={password ? 6 : undefined}
                />
              </div>
              {(password || !oauthToken) && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认密码</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    required={!oauthToken || !!password}
                    minLength={password ? 6 : undefined}
                  />
                </div>
              )}
              {sendCodeCaptcha.required && needVerifyCode && !oauthInfo?.email_verified && (
                <CaptchaWidget onSuccess={sendCodeCaptcha.setToken} onExpired={sendCodeCaptcha.reset} />
              )}
              {registerCaptcha.required && (!needVerifyCode || oauthInfo?.email_verified) && (
                <CaptchaWidget onSuccess={registerCaptcha.setToken} onExpired={registerCaptcha.reset} />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={
                sendingCode || loading ||
                (sendCodeCaptcha.required && needVerifyCode && !oauthInfo?.email_verified && !sendCodeCaptcha.token) ||
                (registerCaptcha.required && (!needVerifyCode || oauthInfo?.email_verified) && !registerCaptcha.token)
              }>
                {loading ? "注册中..." : sendingCode ? "发送验证码中..." : needVerifyCode ? "下一步" : "注册"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                已有账户？
                <Link to="/login" className="text-primary hover:underline ml-1">
                  登录
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                注册即表示您同意我们的
                <Link to="/legal/tos" className="text-primary hover:underline mx-0.5">服务条款</Link>
                和
                <Link to="/legal/privacy" className="text-primary hover:underline mx-0.5">隐私政策</Link>
              </p>
              {!oauthToken && <SocialLoginButtons />}
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                验证码已发送至 <span className="font-medium text-foreground">{method === "phone" ? phone : email}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6 位数字验证码"
                  required
                  autoFocus
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
              {registerCaptcha.required && (
                <CaptchaWidget onSuccess={registerCaptcha.setToken} onExpired={registerCaptcha.reset} />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6 || (registerCaptcha.required && !registerCaptcha.token)}>
                {loading ? "注册中..." : "完成注册"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button type="button" variant="ghost" size="sm" className="h-auto p-0" onClick={() => { setStep(1); setCode(""); setError("") }}>
                  <ArrowLeft className="size-3.5" />
                  返回
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  disabled={countdown > 0 || sendingCode}
                  onClick={handleSendCode}
                >
                  {countdown > 0 ? `重新发送 (${countdown}s)` : "重新发送"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
