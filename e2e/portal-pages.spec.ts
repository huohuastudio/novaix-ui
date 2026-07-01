import { test, expect } from '@playwright/test'

const pages = [
  ['/portal', '云服务器'],
  ['/portal/servers', '云服务器'],
  ['/portal/orders', '费用订单'],
  ['/portal/tickets', '工单'],
  ['/portal/profile', '基本信息'],
  ['/portal/wallet', '余额'],

  ['/portal/notifications', '通知'],
  ['/portal/purchase', '选购云服务器'],
  ['/portal/vpcs', '私有网络'],
] as const

test.describe('用户端页面可访问性', () => {
  for (const [url, text] of pages) {
    test(`访问 ${url}`, async ({ page }) => {
      await page.goto(url)
      await expect(page.getByText(text)).toBeVisible()
    })
  }
})
