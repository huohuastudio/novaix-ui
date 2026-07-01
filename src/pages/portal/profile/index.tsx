import { useEffect, useState, useCallback, useRef } from 'react'
import { Key, Plus, Trash2, Loader2, ShieldCheck, ShieldOff, KeyRound, Mail, Phone, Star, Crown } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RevealOnceDialog } from '@/components/reveal-once-dialog'
import { useIsAdmin } from '@/hooks/use-auth'
import { OAuthAccountsSection } from './oauth-accounts'
import { setRequire2FASetup } from '@/lib/auth'
import { TOTPInput } from '@/components/totp-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  getPortalProfile,
  putPortalProfilePassword,
  getPortalSshKeys,
  postPortalSshKeys,
  deletePortalSshKeysById,
  postPortalTotpSetup,
  postPortalTotpEnable,
  postPortalTotpDisable,
  getPortalApiKeys,
  postPortalApiKeys,
  deletePortalApiKeysById,
  getAdminIntegrations,
  postPortalEmailsSendCode,
  postPortalEmails,
  putPortalEmailsByIdPrimary,
  deletePortalEmailsById,
  postPortalPhoneSendCode,
  putPortalPhone,
} from '@/api'
import type { PortalProfileResponse, PortalSshKeyItem, PortalApiKeyItem, IntegrationIntegrationResponse } from '@/api'
import { useSiteName, useFormatDate, useSiteSettings, useAdminPath } from '@/hooks/use-site-settings'
import { KYCSection } from './kyc-section'
import { getErrorMessage } from '@/lib/utils'
import { useDocumentTitle } from '@uidotdev/usehooks'
import { toast } from 'sonner'

const API_KEY_MODULES = [
  { key: 'instances', label: '云服务器' },
  { key: 'orders', label: '订单' },
  { key: 'tickets', label: '工单' },
  { key: 'ssh-keys', label: 'SSH 密钥' },
  { key: 'profile', label: '个人资料' },
  { key: 'payments', label: '支付' },
  { key: 'notifications', label: '通知' },
  { key: 'plans', label: '套餐' },
  { key: 'announcements', label: '公告' },
  { key: 'agent', label: '代理' },
  { key: 'api-keys', label: 'API 密钥' },
  { key: 'dashboard', label: '仪表盘' },
  { key: 'isos', label: 'ISO 镜像' },
  { key: 'provision', label: '第三方集成（provision）', adminOnly: true },
] as const

const MODULE_LABEL_MAP = Object.fromEntries(API_KEY_MODULES.map((m) => [m.key, m.label]))

function getPermissionLabel(permissions?: Record<string, string[]>) {
  if (!permissions || Object.keys(permissions).length === 0) return '全部权限'
  return Object.keys(permissions)
    .map((key) => MODULE_LABEL_MAP[key] ?? key)
    .join('、')
}

export default function PortalProfile() {
  const siteName = useSiteName()
  const adminPath = useAdminPath()
  const formatDate = useFormatDate()
  const { kyc_enabled } = useSiteSettings()
  useDocumentTitle(`个人资料 - ${siteName}`)

  const [profile, setProfile] = useState<PortalProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // 邮箱管理
  const [addEmailOpen, setAddEmailOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailTotpCode, setEmailTotpCode] = useState('')
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [emailCooldown, setEmailCooldown] = useState(0)
  const [sendingEmailCode, setSendingEmailCode] = useState(false)
  const [addingEmail, setAddingEmail] = useState(false)
  const [removeEmailId, setRemoveEmailId] = useState<number | null>(null)
  const [removeTotpCode, setRemoveTotpCode] = useState('')
  const [removingEmail, setRemovingEmail] = useState(false)
  const [settingPrimary, setSettingPrimary] = useState<number | null>(null)
  const [primaryTotpCode, setPrimaryTotpCode] = useState('')
  const [settingPrimaryLoading, setSettingPrimaryLoading] = useState(false)

  // 手机号管理
  const [bindPhoneOpen, setBindPhoneOpen] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneTotpCode, setPhoneTotpCode] = useState('')
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneCooldown, setPhoneCooldown] = useState(0)
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false)
  const [bindingPhone, setBindingPhone] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwdTotpCode, setPwdTotpCode] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)

  const [sshKeys, setSshKeys] = useState<PortalSshKeyItem[]>([])
  const [sshLoading, setSshLoading] = useState(true)
  const [addKeyOpen, setAddKeyOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyContent, setKeyContent] = useState('')
  const [addingKey, setAddingKey] = useState(false)
  const [deleteKeyId, setDeleteKeyId] = useState<number | null>(null)
  const [deletingKey, setDeletingKey] = useState(false)

  const [totpSetupOpen, setTotpSetupOpen] = useState(false)
  const [totpQRURL, setTotpQRURL] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpEnabling, setTotpEnabling] = useState(false)
  const [totpDisableOpen, setTotpDisableOpen] = useState(false)
  const [totpDisableCode, setTotpDisableCode] = useState('')
  const [totpDisabling, setTotpDisabling] = useState(false)

  const [apiKeys, setApiKeys] = useState<PortalApiKeyItem[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(true)
  const [createKeyOpen, setCreateKeyOpen] = useState(false)
  const [apiKeyName, setApiKeyName] = useState('')
  const [apiKeyExpiry, setApiKeyExpiry] = useState('')
  const [apiKeyPermissions, setApiKeyPermissions] = useState<Record<string, string[]> | null>(null)
  const [apiKeyIntegrationId, setApiKeyIntegrationId] = useState<number | undefined>(undefined)
  const [integrations, setIntegrations] = useState<IntegrationIntegrationResponse[]>([])
  const [creatingKey, setCreatingKey] = useState(false)
  const isAdmin = useIsAdmin()
  const [newPlainKey, setNewPlainKey] = useState('')
  const [showKeyOpen, setShowKeyOpen] = useState(false)
  const [deleteApiKeyId, setDeleteApiKeyId] = useState<number | null>(null)
  const [deletingApiKey, setDeletingApiKey] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const { data: res } = await getPortalProfile()
      setProfile(res?.data ?? null)
    } catch (err) {
      toast.error(getErrorMessage(err, '加载个人资料失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSSHKeys = useCallback(async () => {
    try {
      const { data: res } = await getPortalSshKeys()
      setSshKeys(res?.data ?? [])
    } catch (err) {
      toast.error(getErrorMessage(err, '加载 SSH 密钥失败'))
    } finally {
      setSshLoading(false)
    }
  }, [])

  const fetchAPIKeys = useCallback(async () => {
    try {
      const { data: res } = await getPortalApiKeys()
      setApiKeys(res?.data ?? [])
    } catch (err) {
      toast.error(getErrorMessage(err, '加载 API 密钥失败'))
    } finally {
      setApiKeysLoading(false)
    }
  }, [])

  const togglePermission = (mod: string, action: string) => {
    setApiKeyPermissions((prev) => {
      const next = { ...(prev ?? {}) }
      const current = next[mod] ?? []
      const has = current.includes(action)

      if (has) {
        // 取消读取时同时取消写入
        const remove = action === 'read' ? [action, 'write'] : [action]
        const filtered = current.filter((a) => !remove.includes(a))
        if (filtered.length === 0) delete next[mod]
        else next[mod] = filtered
      } else {
        // 勾选写入时自动勾选读取
        const add = action === 'write' ? ['read', 'write'] : [action]
        next[mod] = [...new Set([...current, ...add])]
      }

      return next
    })
  }

  const totpEnabled = profile?.totp_enabled ?? false

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初始加载数据
    fetchProfile()
    fetchSSHKeys()
    fetchAPIKeys()
  }, [fetchProfile, fetchSSHKeys, fetchAPIKeys])

  // 邮箱验证码倒计时
  useEffect(() => {
    if (emailCooldown <= 0) return
    const timer = setTimeout(() => setEmailCooldown((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [emailCooldown])

  // 手机验证码倒计时
  useEffect(() => {
    if (phoneCooldown <= 0) return
    const timer = setTimeout(() => setPhoneCooldown((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [phoneCooldown])

  const handleSendEmailCode = async () => {
    if (!newEmail.trim()) return
    setSendingEmailCode(true)
    try {
      await postPortalEmailsSendCode({ body: { email: newEmail.trim() } })
      setEmailCodeSent(true)
      setEmailCooldown(60)
      toast.success('验证码已发送')
    } catch (err) {
      toast.error(getErrorMessage(err, '发送失败'))
    } finally {
      setSendingEmailCode(false)
    }
  }

  const handleAddEmail = async () => {
    setAddingEmail(true)
    try {
      await postPortalEmails({
        body: {
          email: newEmail.trim(),
          code: emailCode,
          ...(totpEnabled && emailTotpCode ? { totp_code: emailTotpCode } : {}),
        },
      })
      toast.success('邮箱已添加')
      setAddEmailOpen(false)
      setNewEmail('')
      setEmailCode('')
      setEmailTotpCode('')
      setEmailCodeSent(false)
      fetchProfile()
    } catch (err) {
      toast.error(getErrorMessage(err, '添加失败'))
    } finally {
      setAddingEmail(false)
    }
  }

  const handleSetPrimary = async (emailId: number) => {
    if (totpEnabled) {
      setSettingPrimary(emailId)
      setPrimaryTotpCode('')
      return
    }
    doSetPrimary(emailId)
  }

  const doSetPrimary = async (emailId: number, totpCode?: string) => {
    setSettingPrimaryLoading(true)
    try {
      await putPortalEmailsByIdPrimary({
        path: { id: emailId },
        body: { ...(totpCode ? { totp_code: totpCode } : {}) },
      })
      toast.success('主邮箱已切换')
      setSettingPrimary(null)
      fetchProfile()
    } catch (err) {
      toast.error(getErrorMessage(err, '设置失败'))
    } finally {
      setSettingPrimaryLoading(false)
    }
  }

  const handleRemoveEmail = async (emailId: number) => {
    if (totpEnabled) {
      setRemoveEmailId(emailId)
      setRemoveTotpCode('')
      return
    }
    doRemoveEmail(emailId)
  }

  const doRemoveEmail = async (emailId: number, totpCode?: string) => {
    setRemovingEmail(true)
    try {
      await deletePortalEmailsById({
        path: { id: emailId },
        body: { ...(totpCode ? { totp_code: totpCode } : {}) },
      })
      toast.success('邮箱已删除')
      setRemoveEmailId(null)
      fetchProfile()
    } catch (err) {
      toast.error(getErrorMessage(err, '删除失败'))
    } finally {
      setRemovingEmail(false)
    }
  }

  const handleSendPhoneCode = async () => {
    if (!newPhone.trim()) return
    setSendingPhoneCode(true)
    try {
      await postPortalPhoneSendCode({ body: { phone: newPhone.trim() } })
      setPhoneCodeSent(true)
      setPhoneCooldown(60)
      toast.success('验证码已发送')
    } catch (err) {
      toast.error(getErrorMessage(err, '发送失败'))
    } finally {
      setSendingPhoneCode(false)
    }
  }

  const handleBindPhone = async () => {
    setBindingPhone(true)
    try {
      await putPortalPhone({
        body: {
          phone: newPhone.trim(),
          code: phoneCode,
          ...(totpEnabled && phoneTotpCode ? { totp_code: phoneTotpCode } : {}),
        },
      })
      toast.success('手机号已绑定')
      setBindPhoneOpen(false)
      setNewPhone('')
      setPhoneCode('')
      setPhoneTotpCode('')
      setPhoneCodeSent(false)
      fetchProfile()
    } catch (err) {
      toast.error(getErrorMessage(err, '绑定失败'))
    } finally {
      setBindingPhone(false)
    }
  }

  const emails = profile?.emails ?? []
  const maskPhone = (phone: string) =>
    phone.length > 7 ? phone.slice(0, 3) + '****' + phone.slice(-4) : phone

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('请填写完整')
      return
    }
    if (newPassword.length < 6) {
      toast.error('新密码至少 6 个字符')
      return
    }
    setChangingPwd(true)
    try {
      await putPortalProfilePassword({
        body: { old_password: oldPassword, new_password: newPassword, totp_code: pwdTotpCode || undefined },
      })
      toast.success('密码已修改')
      setOldPassword('')
      setNewPassword('')
      setPwdTotpCode('')
    } catch (err) {
      toast.error(getErrorMessage(err, '修改失败，请检查原密码'))
    } finally {
      setChangingPwd(false)
    }
  }

  const handleAddKey = async () => {
    if (!keyName.trim() || !keyContent.trim()) {
      toast.error('请填写名称和公钥')
      return
    }
    setAddingKey(true)
    try {
      await postPortalSshKeys({ body: { name: keyName.trim(), public_key: keyContent.trim() } })
      toast.success('SSH 密钥已添加')
      setAddKeyOpen(false)
      setKeyName('')
      setKeyContent('')
      fetchSSHKeys()
    } catch (err) {
      toast.error(getErrorMessage(err, '添加失败'))
    } finally {
      setAddingKey(false)
    }
  }

  const handleTOTPSetup = async () => {
    try {
      const { data: res } = await postPortalTotpSetup()
      const d = res?.data
      if (d?.qr_url && d?.secret) {
        setTotpQRURL(d.qr_url)
        setTotpSecret(d.secret)
        setTotpCode('')
        setTotpSetupOpen(true)
      } else {
        toast.error('生成密钥失败')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, '生成密钥失败'))
    }
  }

  const handleTOTPEnable = async () => {
    if (totpCode.length !== 6) return
    setTotpEnabling(true)
    try {
      await postPortalTotpEnable({ body: { code: totpCode } })
      setRequire2FASetup(false)
      toast.success('二次验证已启用')
      setTotpSetupOpen(false)
      fetchProfile()
    } catch (err) {
      toast.error(getErrorMessage(err, '启用失败'))
    } finally {
      setTotpEnabling(false)
    }
  }

  const handleTOTPDisable = async () => {
    if (totpDisableCode.length !== 6) return
    setTotpDisabling(true)
    try {
      await postPortalTotpDisable({ body: { code: totpDisableCode } })
      toast.success('二次验证已禁用')
      setTotpDisableOpen(false)
      setTotpDisableCode('')
      fetchProfile()
    } catch (err) {
      toast.error(getErrorMessage(err, '禁用失败'))
    } finally {
      setTotpDisabling(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!deleteKeyId) return
    setDeletingKey(true)
    try {
      await deletePortalSshKeysById({ path: { id: deleteKeyId } })
      toast.success('SSH 密钥已删除')
      setDeleteKeyId(null)
      fetchSSHKeys()
    } catch (err) {
      toast.error(getErrorMessage(err, '删除失败'))
    } finally {
      setDeletingKey(false)
    }
  }

  const needsIntegration = !!apiKeyPermissions?.provision
  const handleCreateAPIKey = async () => {
    if (!apiKeyName.trim()) {
      toast.error('请填写密钥名称')
      return
    }
    if (needsIntegration && !apiKeyIntegrationId) {
      toast.error('启用 provision 权限时必须选择集成方')
      return
    }
    setCreatingKey(true)
    try {
      const body: {
        name: string
        expires_at?: string
        permissions?: Record<string, string[]>
        integration_id?: number
      } = { name: apiKeyName.trim() }
      if (apiKeyExpiry) {
        body.expires_at = new Date(apiKeyExpiry).toISOString()
      }
      if (apiKeyPermissions && Object.keys(apiKeyPermissions).length > 0) {
        body.permissions = apiKeyPermissions
      }
      if (apiKeyIntegrationId) {
        body.integration_id = apiKeyIntegrationId
      }
      const { data: res } = await postPortalApiKeys({ body })
      const plainKey = res?.data?.plain_key ?? ''
      setNewPlainKey(plainKey)
      setCreateKeyOpen(false)
      setApiKeyName('')
      setApiKeyExpiry('')
      setApiKeyPermissions(null)
      setApiKeyIntegrationId(undefined)
      setShowKeyOpen(true)
      fetchAPIKeys()
    } catch (err) {
      toast.error(getErrorMessage(err, '创建失败'))
    } finally {
      setCreatingKey(false)
    }
  }

  // 用 ref 而不是 length === 0 判定，避免空列表导致每次打开对话框都重复拉取
  const integrationsLoadedRef = useRef(false)
  useEffect(() => {
    if (createKeyOpen && isAdmin && !integrationsLoadedRef.current) {
      integrationsLoadedRef.current = true
      getAdminIntegrations()
        .then(({ data: res }) => setIntegrations(res?.data ?? []))
        .catch(() => {
          integrationsLoadedRef.current = false
        })
    }
  }, [createKeyOpen, isAdmin])


  const handleDeleteAPIKey = async () => {
    if (!deleteApiKeyId) return
    setDeletingApiKey(true)
    try {
      await deletePortalApiKeysById({ path: { id: deleteApiKeyId } })
      toast.success('API 密钥已删除')
      setDeleteApiKeyId(null)
      fetchAPIKeys()
    } catch (err) {
      toast.error(getErrorMessage(err, '删除失败'))
    } finally {
      setDeletingApiKey(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">个人资料</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理您的账户信息</p>
        </div>
        <div className="rounded-2xl bg-background p-6 sm:p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-20 mt-6" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-4 w-20 mt-4" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">个人资料</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理您的账户信息</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList variant="line" className="mb-2">
            <TabsTrigger value="profile">基本信息</TabsTrigger>
            <TabsTrigger value="security">安全设置</TabsTrigger>
            <TabsTrigger value="keys">密钥管理</TabsTrigger>
          </TabsList>

          {/* ═══ 基本信息 ═══ */}
          <TabsContent value="profile">
            <div className="rounded-2xl bg-background p-6 sm:p-8">
              <h3 className="text-sm font-medium">基本信息</h3>
              <p className="text-xs text-muted-foreground mt-1">您的账户基本信息</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <Label className="text-muted-foreground text-xs">用户名</Label>
                  <p className="text-sm font-medium mt-1">{profile?.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">注册时间</Label>
                  <p className="text-sm font-medium mt-1">{formatDate(profile?.created_at ?? '')}</p>
                </div>
              </div>

              <Separator className="my-8" />

              {/* 邮箱 */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">邮箱地址</h3>
                  <p className="text-xs text-muted-foreground mt-1">用于接收通知和找回密码，任意已验证邮箱均可登录</p>
                </div>
                {emails.length < 5 && (
                  <Button onClick={() => { setNewEmail(''); setEmailCode(''); setEmailTotpCode(''); setEmailCodeSent(false); setAddEmailOpen(true) }}>
                    <Plus className="size-4" />
                    添加邮箱
                  </Button>
                )}
              </div>
              <div className="mt-4 max-w-2xl">
                {emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed">
                    <Mail className="size-8 text-muted-foreground/25 mb-2" />
                    <p className="text-[13px] text-muted-foreground">尚未绑定邮箱</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emails.map((em) => (
                      <div key={em.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="size-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{em.email}</span>
                          {em.is_primary && (
                            <Badge variant="secondary" className="shrink-0 gap-1">
                              <Crown className="size-3" />
                              主邮箱
                            </Badge>
                          )}
                        </div>
                        {!em.is_primary && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => handleSetPrimary(em.id!)}
                            >
                              <Star className="size-3" />
                              设为主邮箱
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveEmail(em.id!)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="my-8" />

              {/* 手机号 */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">绑定手机号</h3>
                  <p className="text-xs text-muted-foreground mt-1">用于接收短信验证码与找回密码</p>
                </div>
                <Button
                  variant={profile?.phone ? 'outline' : 'default'}
                  onClick={() => { setNewPhone(''); setPhoneCode(''); setPhoneTotpCode(''); setPhoneCodeSent(false); setBindPhoneOpen(true) }}
                >
                  <Phone className="size-4" />
                  {profile?.phone ? '更换手机号' : '绑定手机号'}
                </Button>
              </div>
              {profile?.phone && (
                <div className="mt-4 max-w-md">
                  <p className="text-sm font-mono">{maskPhone(profile.phone)}</p>
                </div>
              )}

              <Separator className="my-8" />

              {/* 修改密码 */}
              <h3 className="text-sm font-medium">修改密码</h3>
              <p className="text-xs text-muted-foreground mt-1">定期修改密码以保护账户安全</p>
              <div className="mt-4 max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="old-password">当前密码</Label>
                  <Input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                {totpEnabled && (
                  <div className="space-y-2">
                    <Label>二次验证码</Label>
                    <TOTPInput value={pwdTotpCode} onChange={setPwdTotpCode} />
                  </div>
                )}
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPwd || !oldPassword || !newPassword}
                >
                  {changingPwd && <Loader2 className="size-4 animate-spin" />}
                  修改密码
                </Button>
              </div>

              {kyc_enabled === 'true' && (
                <>
                  <Separator className="my-8" />
                  <KYCSection />
                </>
              )}
            </div>
          </TabsContent>

          {/* ═══ 安全设置 ═══ */}
          <TabsContent value="security">
            <div className="rounded-2xl bg-background p-6 sm:p-8">
              {/* 二次验证 */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">二次验证（2FA）</h3>
                  <p className="text-xs text-muted-foreground mt-1">使用验证器 App 增加账户安全性</p>
                </div>
                {totpEnabled ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-3.5" />
                      已启用
                    </span>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { setTotpDisableCode(''); setTotpDisableOpen(true) }}
                    >
                      <ShieldOff className="size-4" />
                      禁用
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleTOTPSetup}>
                    <ShieldCheck className="size-4" />
                    启用二次验证
                  </Button>
                )}
              </div>

              <Separator className="my-8" />

              {/* 社交账号 */}
              <OAuthAccountsSection />
            </div>
          </TabsContent>

          {/* ═══ 密钥管理 ═══ */}
          <TabsContent value="keys">
            <div className="rounded-2xl bg-background p-6 sm:p-8">
              {/* SSH 密钥 */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">SSH 密钥</h3>
                  <p className="text-xs text-muted-foreground mt-1">用于创建云服务器时自动注入公钥，免密码登录</p>
                </div>
                <Button onClick={() => setAddKeyOpen(true)}>
                  <Plus className="size-4" />
                  添加密钥
                </Button>
              </div>
              <div className="mt-4">
                {sshLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div>
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-48 mt-1.5" />
                        </div>
                        <Skeleton className="size-8" />
                      </div>
                    ))}
                  </div>
                ) : sshKeys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed">
                    <Key className="size-8 text-muted-foreground/25 mb-2" />
                    <p className="text-[13px] text-muted-foreground">尚未添加 SSH 密钥</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sshKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{key.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                            {key.fingerprint}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            添加于 {formatDate(key.created_at ?? '')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => setDeleteKeyId(key.id!)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="my-8" />

              {/* API 密钥 */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">API 密钥</h3>
                  <p className="text-xs text-muted-foreground mt-1">用于通过 API 访问您的资源，替代登录令牌</p>
                </div>
                <Button onClick={() => setCreateKeyOpen(true)}>
                  <Plus className="size-4" />
                  创建密钥
                </Button>
              </div>
              <div className="mt-4">
                {apiKeysLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div>
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36 mt-1.5" />
                        </div>
                        <Skeleton className="size-8" />
                      </div>
                    ))}
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed">
                    <KeyRound className="size-8 text-muted-foreground/25 mb-2" />
                    <p className="text-[13px] text-muted-foreground">尚未创建 API 密钥</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{key.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {key.prefix}••••••••
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getPermissionLabel(key.permissions)}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>创建于 {formatDate(key.created_at ?? '')}</span>
                            {key.last_used_at && <span>最后使用 {formatDate(key.last_used_at)}</span>}
                            {key.expires_at && <span>过期于 {formatDate(key.expires_at)}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => setDeleteApiKeyId(key.id!)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 添加 SSH 密钥 */}
      <Dialog open={addKeyOpen} onOpenChange={setAddKeyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加 SSH 密钥</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                placeholder="例如：My MacBook"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>公钥</Label>
              <Textarea
                placeholder="ssh-rsa AAAA... 或 ssh-ed25519 AAAA..."
                rows={5}
                className="font-mono text-xs"
                value={keyContent}
                onChange={(e) => setKeyContent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                粘贴 ~/.ssh/id_rsa.pub 或 ~/.ssh/id_ed25519.pub 的内容
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddKeyOpen(false)}>取消</Button>
            <Button onClick={handleAddKey} disabled={addingKey || !keyName.trim() || !keyContent.trim()}>
              {addingKey && <Loader2 className="size-4 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 启用二次验证 */}
      <Dialog open={totpSetupOpen} onOpenChange={setTotpSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>启用二次验证</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              使用 Google Authenticator、Microsoft Authenticator 等验证器 App 扫描下方二维码
            </p>
            <div className="flex justify-center py-2">
              {totpQRURL && (
                <div className="rounded-xl border p-3 bg-white">
                  <QRCodeSVG value={totpQRURL} size={180} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">无法扫码？手动输入密钥</Label>
              <div className="rounded-lg border bg-muted/50 px-3 py-2">
                <code className="text-xs font-mono break-all select-all">{totpSecret}</code>
              </div>
            </div>
            <div className="space-y-2">
              <Label>输入验证码确认</Label>
              <div className="flex justify-center">
                <TOTPInput value={totpCode} onChange={setTotpCode} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTotpSetupOpen(false)}>取消</Button>
            <Button onClick={handleTOTPEnable} disabled={totpEnabling || totpCode.length !== 6}>
              {totpEnabling && <Loader2 className="size-4 animate-spin" />}
              启用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 禁用二次验证 */}
      <AlertDialog open={totpDisableOpen} onOpenChange={(open) => !open && setTotpDisableOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>禁用二次验证</AlertDialogTitle>
            <AlertDialogDescription>
              禁用后登录将不再需要验证码。请输入当前验证码确认操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-2">
            <TOTPInput value={totpDisableCode} onChange={setTotpDisableCode} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleTOTPDisable}
              disabled={totpDisabling || totpDisableCode.length !== 6}
            >
              {totpDisabling && <Loader2 className="size-4 animate-spin" />}
              禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除 SSH 密钥确认 */}
      <AlertDialog open={deleteKeyId !== null} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 SSH 密钥</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此 SSH 密钥吗？已创建的云服务器不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteKey}
              disabled={deletingKey}
            >
              {deletingKey && <Loader2 className="size-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 创建 API 密钥 */}
      <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>创建 API 密钥</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                placeholder="例如：CI/CD 部署"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>过期时间（可选）</Label>
              <Input
                type="date"
                value={apiKeyExpiry}
                onChange={(e) => setApiKeyExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                留空表示永不过期
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>接口权限</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="full-access" className="text-xs text-muted-foreground font-normal">全部权限</Label>
                  <Switch
                    id="full-access"
                    checked={apiKeyPermissions === null}
                    onCheckedChange={(checked) => setApiKeyPermissions(checked ? null : {})}
                  />
                </div>
              </div>
              {apiKeyPermissions !== null && (
                <div className="rounded-lg border max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-[1fr_48px_48px] items-center px-3 py-2 border-b bg-muted sticky top-0 z-10">
                    <span className="text-xs font-medium text-muted-foreground">模块</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">读取</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">写入</span>
                  </div>
                  <div className="divide-y">
                    {API_KEY_MODULES.filter((mod) => !('adminOnly' in mod && mod.adminOnly) || isAdmin).map((mod) => (
                      <div key={mod.key} className="grid grid-cols-[1fr_48px_48px] items-center px-3 py-2">
                        <span className="text-sm">{mod.label}</span>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={(apiKeyPermissions?.[mod.key] ?? []).includes('read')}
                            onCheckedChange={() => togglePermission(mod.key, 'read')}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={(apiKeyPermissions?.[mod.key] ?? []).includes('write')}
                            onCheckedChange={() => togglePermission(mod.key, 'write')}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {needsIntegration && (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="api-key-integration" className="text-sm">
                    关联集成方<span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Select
                    value={apiKeyIntegrationId ? String(apiKeyIntegrationId) : undefined}
                    onValueChange={(v) => setApiKeyIntegrationId(v ? Number(v) : undefined)}
                  >
                    <SelectTrigger id="api-key-integration">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrations.map((it) => (
                        <SelectItem key={it.id} value={String(it.id)}>
                          {it.name}{it.status === 0 ? '（已禁用）' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    provision 权限的密钥必须关联到集成方。<a href={`${adminPath}/integrations`} target="_blank" className="underline">前往管理集成方</a>
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateKeyOpen(false)}>取消</Button>
            <Button
              onClick={handleCreateAPIKey}
              disabled={
                creatingKey ||
                !apiKeyName.trim() ||
                (apiKeyPermissions !== null && Object.keys(apiKeyPermissions).length === 0) ||
                (needsIntegration && !apiKeyIntegrationId)
              }
            >
              {creatingKey && <Loader2 className="size-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 显示新创建的 API 密钥 */}
      <RevealOnceDialog
        open={showKeyOpen}
        onOpenChange={setShowKeyOpen}
        title="API 密钥已创建"
        description="请立即复制并妥善保存，密钥仅显示一次，关闭后将无法再次查看。"
        value={newPlainKey}
      />

      {/* 添加邮箱 */}
      <Dialog open={addEmailOpen} onOpenChange={setAddEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加邮箱</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>邮箱地址</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={emailCodeSent}
                />
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={handleSendEmailCode}
                  disabled={sendingEmailCode || !newEmail.trim() || emailCooldown > 0}
                >
                  {sendingEmailCode && <Loader2 className="size-4 animate-spin" />}
                  {emailCooldown > 0 ? `${emailCooldown}s` : '发送验证码'}
                </Button>
              </div>
            </div>
            {emailCodeSent && (
              <>
                <div className="space-y-2">
                  <Label>验证码</Label>
                  <Input
                    placeholder="6 位验证码"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                  />
                </div>
                {totpEnabled && (
                  <div className="space-y-2">
                    <Label>二次验证码</Label>
                    <div className="flex justify-center">
                      <TOTPInput value={emailTotpCode} onChange={setEmailTotpCode} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmailOpen(false)}>取消</Button>
            <Button
              onClick={handleAddEmail}
              disabled={addingEmail || !emailCodeSent || emailCode.length !== 6 || (totpEnabled && emailTotpCode.length !== 6)}
            >
              {addingEmail && <Loader2 className="size-4 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除邮箱 TOTP 确认 */}
      <AlertDialog open={removeEmailId !== null && totpEnabled} onOpenChange={(open) => !open && setRemoveEmailId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除邮箱</AlertDialogTitle>
            <AlertDialogDescription>请输入二次验证码确认删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-2">
            <TOTPInput value={removeTotpCode} onChange={setRemoveTotpCode} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => removeEmailId && doRemoveEmail(removeEmailId, removeTotpCode)}
              disabled={removingEmail || removeTotpCode.length !== 6}
            >
              {removingEmail && <Loader2 className="size-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 设为主邮箱 TOTP 确认 */}
      <AlertDialog open={settingPrimary !== null} onOpenChange={(open) => !open && setSettingPrimary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>切换主邮箱</AlertDialogTitle>
            <AlertDialogDescription>请输入二次验证码确认切换。</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-2">
            <TOTPInput value={primaryTotpCode} onChange={setPrimaryTotpCode} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settingPrimary && doSetPrimary(settingPrimary, primaryTotpCode)}
              disabled={settingPrimaryLoading || primaryTotpCode.length !== 6}
            >
              {settingPrimaryLoading && <Loader2 className="size-4 animate-spin" />}
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 绑定/更换手机号 */}
      <Dialog open={bindPhoneOpen} onOpenChange={setBindPhoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{profile?.phone ? '更换手机号' : '绑定手机号'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>手机号</Label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={phoneCodeSent}
                />
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={handleSendPhoneCode}
                  disabled={sendingPhoneCode || !newPhone.trim() || phoneCooldown > 0}
                >
                  {sendingPhoneCode && <Loader2 className="size-4 animate-spin" />}
                  {phoneCooldown > 0 ? `${phoneCooldown}s` : '发送验证码'}
                </Button>
              </div>
            </div>
            {phoneCodeSent && (
              <>
                <div className="space-y-2">
                  <Label>验证码</Label>
                  <Input
                    placeholder="6 位验证码"
                    maxLength={6}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                  />
                </div>
                {totpEnabled && (
                  <div className="space-y-2">
                    <Label>二次验证码</Label>
                    <div className="flex justify-center">
                      <TOTPInput value={phoneTotpCode} onChange={setPhoneTotpCode} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindPhoneOpen(false)}>取消</Button>
            <Button
              onClick={handleBindPhone}
              disabled={bindingPhone || !phoneCodeSent || phoneCode.length !== 6 || (totpEnabled && phoneTotpCode.length !== 6)}
            >
              {bindingPhone && <Loader2 className="size-4 animate-spin" />}
              {profile?.phone ? '更换' : '绑定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除 API 密钥确认 */}
      <AlertDialog open={deleteApiKeyId !== null} onOpenChange={(open) => !open && setDeleteApiKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 API 密钥</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此 API 密钥吗？使用该密钥的所有应用将无法继续访问。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteAPIKey}
              disabled={deletingApiKey}
            >
              {deletingApiKey && <Loader2 className="size-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
