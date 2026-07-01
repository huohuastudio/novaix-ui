import { test, expect } from '@playwright/test'
import { clickAdminUserMenu } from './helpers'

test.describe('管理后台登出', () => {
  test('点击退出登录后跳转到登录页', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible()

    await clickAdminUserMenu(page)
    await page.getByText('退出登录').click()
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 })
  })
})
