import { test, expect } from '@playwright/test'

test.describe('首页', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('首页加载成功并展示透明定价', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('开始使用')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('透明定价')).toBeVisible()
  })
})
