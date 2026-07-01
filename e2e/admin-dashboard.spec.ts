import { test, expect } from '@playwright/test'
import { clickSidebarNav } from './helpers'

test.describe('管理后台仪表盘', () => {
  test('加载仪表盘并展示统计卡片', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()
    await expect(page.getByText('节点')).toBeVisible()
    await expect(page.getByText('实例')).toBeVisible()
    await expect(page.getByText('用户')).toBeVisible()
    await expect(page.getByText('本月收入')).toBeVisible()
  })
})

test.describe('侧边栏导航', () => {
  const navItems = [
    ['节点管理', '/admin/nodes'],
    ['实例管理', '/admin/instances'],
    ['IP 池管理', '/admin/ips'],
    ['共享 IP', '/admin/shared-ips'],
    ['私有网络', '/admin/vpcs'],
    ['镜像管理', '/admin/images'],
    ['ISO 镜像', '/admin/isos'],
    ['用户管理', '/admin/users'],
    ['订单管理', '/admin/orders'],
    ['套餐管理', '/admin/plans'],
    ['流量包', '/admin/traffic-packages'],
    ['支付记录', '/admin/payments'],
    ['优惠券', '/admin/coupons'],
    ['代理管理', '/admin/agents'],
    ['内容管理', '/admin/cms'],
    ['工单系统', '/admin/tickets'],
    ['插件', '/admin/plugins'],
    ['主题', '/admin/themes'],
    ['集成方', '/admin/integrations'],
    ['任务管理', '/admin/tasks'],
    ['告警记录', '/admin/alerts'],
    ['操作日志', '/admin/logs'],
    ['系统设置', '/admin/settings'],
    ['关于', '/admin/about'],
  ] as const

  for (const [name, url] of navItems) {
    test(`点击「${name}」导航到 ${url}`, async ({ page }) => {
      await page.goto('/admin')
      await clickSidebarNav(page, name)
      await expect(page).toHaveURL(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    })
  }
})
