import { test, expect } from '@playwright/test'
import { openPortalUserMenu } from './helpers'

test.describe('用户端导航', () => {
  const navItems = [
    ['云服务器', '/portal/servers'],
    ['私有网络', '/portal/vpcs'],
    ['费用订单', '/portal/orders'],
    ['工单', '/portal/tickets'],
  ] as const

  for (const [name, url] of navItems) {
    test(`点击「${name}」导航到 ${url}`, async ({ page }) => {
      await page.goto('/portal')
      await page.getByRole('link', { name }).click()
      await expect(page).toHaveURL(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    })
  }

  test('用户菜单可以导航到个人资料', async ({ page }) => {
    await page.goto('/portal')
    await openPortalUserMenu(page)
    await page.getByText('个人资料').click()
    await expect(page).toHaveURL(/\/portal\/profile/)
  })

  test('用户菜单可以导航到钱包', async ({ page }) => {
    await page.goto('/portal')
    await openPortalUserMenu(page)
    await page.getByText('我的钱包').click()
    await expect(page).toHaveURL(/\/portal\/wallet/)
  })
})
