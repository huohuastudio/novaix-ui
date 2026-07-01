import { test, expect } from '@playwright/test'

test.describe('特殊页面', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('模拟登录页无 ticket 参数时显示错误', async ({ page }) => {
    await page.goto('/portal/impersonate')
    await expect(page.getByText('缺少登录凭证')).toBeVisible()
  })

  test('模拟登录页无效 ticket 显示错误', async ({ page }) => {
    await page.goto('/portal/impersonate?ticket=invalid')
    await expect(page.getByText(/凭证无效|已过期/)).toBeVisible({ timeout: 10_000 })
  })
})
