import { useState, useEffect, useCallback, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSiteSettings } from "@/hooks/use-site-settings"
import { useCaptcha } from "@/hooks/use-captcha"
import { CaptchaWidget } from "@/components/captcha-widget"
import { useDocumentTitle } from '@uidotdev/usehooks'
import { postResetPassword, postResetPasswordSendCode } from "@/api"
import { getErrorMessage } from "@/lib/utils"

export default function ResetPasswordPage() {
  const { site_name: siteName, site_logo: logo, sms_enabled } = useSiteSettings()
  const smsEnabled = sms_enabled === "true"
  const navigate = useNavigate()
  useDocumentTitle(`重置密码 - ${siteName}`)

  const [step, setStep] = useState<1 | 2>(1)
  const [method, setMethod] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const sendCodeCaptcha = useCaptcha("send_code")
  const resetCaptcha = useCaptcha("reset_password")

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
      const { data: res } = await postResetPasswordSendCode({ body })
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

  const handleStep1 = (e: FormEvent) => {
    e.preventDefault()
    handleSendCode()
  }

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }
    setLoading(true)
    try {
      const identity = method === "phone" ? { phone } : { email }
      const { data: res } = await postResetPassword({
        body: { ...identity, code, password, ...(resetCaptcha.token ? { captcha_token: resetCaptcha.token } : {}) },
      })
      if (res?.code === 0) {
        toast.success("密码重置成功，请重新登录")
        navigate("/login", { replace: true })
      } else {
        setError(res?.message || "重置密码失败")
      }
    } catch (err) {
      setError(getErrorMessage(err, "重置密码失败"))
    } finally {
      setLoading(false)
    }
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
            {step === 1 ? "输入账号找回密码" : "输入验证码和新密码"}
          </p>
        </div>

        <div>
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              {smsEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={method === "email" ? "default" : "outline"} onClick={() => setMethod("email")}>
                    邮箱找回
                  </Button>
                  <Button type="button" variant={method === "phone" ? "default" : "outline"} onClick={() => setMethod("phone")}>
                    手机号找回
                  </Button>
                </div>
              )}
              {method === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入注册邮箱"
                    required
                    autoFocus
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
                    placeholder="请输入注册手机号"
                    required
                    autoFocus
                    inputMode="numeric"
                  />
                </div>
              )}
              {sendCodeCaptcha.required && (
                <CaptchaWidget onSuccess={sendCodeCaptcha.setToken} onExpired={sendCodeCaptcha.reset} />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={sendingCode || (sendCodeCaptcha.required && !sendCodeCaptcha.token)}>
                {sendingCode ? "发送验证码中..." : "发送验证码"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">
                  返回登录
                </Link>
              </p>
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
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 个字符"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  required
                  minLength={6}
                />
              </div>
              {resetCaptcha.required && (
                <CaptchaWidget onSuccess={resetCaptcha.setToken} onExpired={resetCaptcha.reset} />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6 || (resetCaptcha.required && !resetCaptcha.token)}>
                {loading ? "重置中..." : "重置密码"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button type="button" variant="ghost" size="sm" className="h-auto p-0" onClick={() => { setStep(1); setCode(""); setPassword(""); setConfirmPassword(""); setError("") }}>
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
