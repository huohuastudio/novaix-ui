import { useEffect, useState } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { postOauthConfirmLink, postOauthExchange } from "@/api"
import { setToken, setUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TOTPInput } from "@/components/totp-input"
import { getErrorMessage } from "@/lib/utils"

type UserInfo = { id: number; username: string; email: string; role: string }

function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw
  return "/portal"
}

function loginAndRedirect(token: string, user: UserInfo, redirect: string) {
  setToken(token)
  setUser(user)
  window.location.href = redirect
}

export default function OAuthComplete() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const loginCode = params.get("login_code")
  const linked = params.get("linked")
  const error = params.get("error")
  const action = params.get("action")
  const linkToken = params.get("link_token")
  const totpCode = params.get("totp_code")
  const oauthToken = params.get("oauth_token")
  const redirect = safeRedirect(params.get("redirect"))

  // Flow A: 用 login_code 兑换 JWT+user
  useEffect(() => {
    if (!loginCode) return
    void (async () => {
      try {
        const { data: res } = await postOauthExchange({ body: { login_code: loginCode } })
        if (res?.code === 0 && res.data?.token && res.data.user) {
          loginAndRedirect(res.data.token, res.data.user as UserInfo, redirect)
        } else {
          toast.error(res?.message ?? "登录失败")
          navigate("/login", { replace: true })
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "登录失败"))
        navigate("/login", { replace: true })
      }
    })()
  }, [loginCode, redirect, navigate])

  // Flow D: 关联成功
  useEffect(() => {
    if (linked === "1") {
      toast.success("社交账号关联成功")
      navigate(redirect, { replace: true })
    }
  }, [linked, redirect, navigate])

  // Flow C: 新用户注册
  useEffect(() => {
    if (oauthToken) {
      const params = new URLSearchParams({ oauth_token: oauthToken })
      if (redirect !== "/portal") params.set("redirect", redirect)
      navigate(`/register?${params}`, { replace: true })
    }
  }, [oauthToken, redirect, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-lg font-medium mb-2">登录失败</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Link to="/login">
            <Button variant="outline">返回登录</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Flow B: 密码确认关联
  if (action === "link_confirm" && linkToken) {
    return <ConfirmLinkForm linkToken={linkToken} redirect={redirect} />
  }

  // TOTP 挑战
  if (action === "totp" && totpCode) {
    return <TOTPForm loginCode={totpCode} redirect={redirect} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function ConfirmLinkForm({ linkToken, redirect }: { linkToken: string; redirect: string }) {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { data: res } = await postOauthConfirmLink({ body: { link_token: linkToken, password } })
      if (res?.code === 0 && res.data?.login_code) {
        const { data: exRes } = await postOauthExchange({ body: { login_code: res.data.login_code } })
        if (exRes?.code === 0 && exRes.data?.token && exRes.data.user) {
          loginAndRedirect(exRes.data.token, exRes.data.user as UserInfo, redirect)
          return
        }
        // 需要 TOTP
        if (exRes?.code === 21000) {
          navigate(`/oauth/complete?action=totp&totp_code=${res.data.login_code}&redirect=${encodeURIComponent(redirect)}`, { replace: true })
          return
        }
        setError(exRes?.message ?? "登录失败")
      } else {
        setError(res?.message ?? "密码验证失败")
      }
    } catch (err) {
      setError(getErrorMessage(err, "请求失败，请重试"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h2 className="text-lg font-medium">关联已有账户</h2>
          <p className="text-sm text-muted-foreground mt-2">
            该社交账号的邮箱与已有账户匹配，请输入密码确认关联
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">账户密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入您的账户密码"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "验证中..." : "确认关联并登录"}
          </Button>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
            返回登录
          </Link>
        </form>
      </div>
    </div>
  )
}

function TOTPForm({ loginCode, redirect }: { loginCode: string; redirect: string }) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { data: res } = await postOauthExchange({ body: { login_code: loginCode, totp_code: code } })
      if (res?.code === 0 && res.data?.token && res.data.user) {
        loginAndRedirect(res.data.token, res.data.user as UserInfo, redirect)
      } else {
        setError(res?.message ?? "验证码错误")
      }
    } catch (err) {
      setError(getErrorMessage(err, "请求失败，请重试"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h2 className="text-lg font-medium">二次验证</h2>
          <p className="text-sm text-muted-foreground mt-2">请输入验证器 App 中的验证码</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <Label>验证码</Label>
            <TOTPInput value={code} onChange={setCode} autoFocus />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? "验证中..." : "验证"}
          </Button>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
            返回登录
          </Link>
        </form>
      </div>
    </div>
  )
}
