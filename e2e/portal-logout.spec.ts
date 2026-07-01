import { test, expect } from '@playwright/test'
import { openPortalUserMenu } from './helpers'

test.describe('用户端登出', () => {
  test('点击退出登录后跳转到登录页', async ({ page }) => {
    await page.goto('/portal')
    await expect(page.getByText('云服务器')).toBeVisible()

    await openPortalUserMenu(page)
    await page.getByText('退出登录').click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
