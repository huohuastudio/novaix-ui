import { test, expect } from '@playwright/test'

const sections = [
  ['site', '站点信息'],
  ['homepage', '首页内容'],
  ['locale', '货币与本地化'],
  ['legal', '服务条款'],
  ['maintenance', '维护模式'],
  ['advanced', '高级设置'],
  ['smtp', '邮件通知'],
  ['email_templates', '邮件模板'],
  ['mail_inbound', '邮件回复'],
  ['notify', '通知渠道'],
  ['sms', '短信'],
  ['alert', '告警配置'],
  ['ticket', '工单'],
  ['payment', '支付渠道'],
  ['agent', '代理系统'],
  ['security', '安全'],
  ['captcha', '人机验证'],
  ['registration', '注册设置'],
  ['oauth', '社会化登录'],
  ['kyc', '实名认证'],
  ['instance', '实例创建'],
  ['lifecycle', '实例生命周期'],
  ['backup', '自动备份'],
  ['storage', '对象存储'],
  ['rescue', '救援模式'],
  ['rdns', 'rDNS'],
] as const

test.describe('系统设置子页面可访问性', () => {
  for (const [section, label] of sections) {
    test(`访问设置 - ${label}`, async ({ page }) => {
      await page.goto(`/admin/settings/${section}`)
      await expect(page.getByText(label)).toBeVisible({ timeout: 10_000 })
    })
  }
})
