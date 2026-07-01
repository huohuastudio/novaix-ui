import { test, expect } from '@playwright/test'

const pages = [
  ['/admin/settings', '站点名称'],
  ['/admin/nodes', '节点管理'],
  ['/admin/plans', '套餐管理'],
  ['/admin/users', '用户管理'],
  ['/admin/orders', '订单管理'],
  ['/admin/tickets', '工单管理'],
  ['/admin/instances', '实例管理'],
  ['/admin/ips', 'IP 池管理'],
  ['/admin/shared-ips', '共享 IP 管理'],
  ['/admin/images', '镜像管理'],
  ['/admin/traffic-packages', '流量包管理'],
  ['/admin/coupons', '优惠券管理'],
  ['/admin/cms', '内容管理'],
  ['/admin/vpcs', 'VPC 管理'],
  ['/admin/integrations', '集成方管理'],
  ['/admin/plugins', '插件管理'],
  ['/admin/themes', '主题管理'],
  ['/admin/alerts', '告警记录'],
  ['/admin/tasks', '任务管理'],
  ['/admin/payments', '支付记录'],
  ['/admin/logs', '操作日志'],
  ['/admin/isos', 'ISO 镜像'],
  ['/admin/agents', '代理管理'],
  ['/admin/about', '关于'],
] as const

test.describe('管理后台核心页面可访问性', () => {
  for (const [url, text] of pages) {
    test(`访问 ${url}`, async ({ page }) => {
      await page.goto(url)
      await expect(page.getByText(text)).toBeVisible()
    })
  }
})
