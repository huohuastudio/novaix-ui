import { test, expect } from '@playwright/test'

test.describe('法律页面', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('服务条款页面可访问', async ({ page }) => {
    await page.goto('/legal/tos')
    await expect(page.getByText('服务条款')).toBeVisible()
  })

  test('隐私政策页面可访问', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(page.getByText('隐私政策')).toBeVisible()
  })
})
