import type { ComponentType, SVGProps } from "react"
import {
  SiQq, SiQqHex,
  SiWechat, SiWechatHex,
  SiAlipay, SiAlipayHex,
  SiSinaweibo, SiSinaweiboHex,
  SiBaidu, SiBaiduHex,
  SiHuawei, SiHuaweiHex,
  SiGithub,
  SiGoogle, SiGoogleHex,
  SiApple,
  SiTiktok,
  SiGitee, SiGiteeHex,
  SiXiaomi, SiXiaomiHex,
  SiPaypal, SiPaypalHex,
  SiTether, SiTetherHex,
  SiStripe, SiStripeHex,
  SiFacebook, SiFacebookHex,
  SiBilibili, SiBilibiliHex,
  SiX, SiXHex,
  SiBytedance, SiBytedanceHex,
} from "@icons-pack/react-simple-icons"
import { IconMicrosoft, IconDingtalk, IconWecom } from "./brand-icons"

export interface BrandMeta {
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; color?: string }>
  color?: string
}

const BRAND_MAP: Record<string, BrandMeta> = {
  qq: { icon: SiQq, color: `#${SiQqHex}` },
  wechat: { icon: SiWechat, color: `#${SiWechatHex}` },
  wx: { icon: SiWechat, color: `#${SiWechatHex}` },
  weixin: { icon: SiWechat, color: `#${SiWechatHex}` },
  alipay: { icon: SiAlipay, color: `#${SiAlipayHex}` },
  weibo: { icon: SiSinaweibo, color: `#${SiSinaweiboHex}` },
  sina: { icon: SiSinaweibo, color: `#${SiSinaweiboHex}` },
  sinaweibo: { icon: SiSinaweibo, color: `#${SiSinaweiboHex}` },
  baidu: { icon: SiBaidu, color: `#${SiBaiduHex}` },
  huawei: { icon: SiHuawei, color: `#${SiHuaweiHex}` },
  github: { icon: SiGithub },
  google: { icon: SiGoogle, color: `#${SiGoogleHex}` },
  apple: { icon: SiApple },
  douyin: { icon: SiTiktok },
  tiktok: { icon: SiTiktok },
  gitee: { icon: SiGitee, color: `#${SiGiteeHex}` },
  xiaomi: { icon: SiXiaomi, color: `#${SiXiaomiHex}` },
  wxpay: { icon: SiWechat, color: `#${SiWechatHex}` },
  wechatpay: { icon: SiWechat, color: `#${SiWechatHex}` },
  qqpay: { icon: SiQq, color: `#${SiQqHex}` },
  qqwallet: { icon: SiQq, color: `#${SiQqHex}` },
  paypal: { icon: SiPaypal, color: `#${SiPaypalHex}` },
  usdt: { icon: SiTether, color: `#${SiTetherHex}` },
  tether: { icon: SiTether, color: `#${SiTetherHex}` },
  stripe: { icon: SiStripe, color: `#${SiStripeHex}` },
  facebook: { icon: SiFacebook, color: `#${SiFacebookHex}` },
  bilibili: { icon: SiBilibili, color: `#${SiBilibiliHex}` },
  twitter: { icon: SiX, color: `#${SiXHex}` },
  x: { icon: SiX, color: `#${SiXHex}` },
  feishu: { icon: SiBytedance, color: `#${SiBytedanceHex}` },
  lark: { icon: SiBytedance, color: `#${SiBytedanceHex}` },
  microsoft: { icon: IconMicrosoft, color: "#00A4EF" },
  dingtalk: { icon: IconDingtalk, color: "#007FFF" },
  wework: { icon: IconWecom, color: "#0082EF" },
  wecom: { icon: IconWecom, color: "#0082EF" },
  enterprisewechat: { icon: IconWecom, color: "#0082EF" },
}

export function getBrandMeta(key: string): BrandMeta | null {
  return BRAND_MAP[key.toLowerCase()] ?? null
}
