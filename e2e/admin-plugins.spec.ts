import { test, expect } from '@playwright/test'

test.describe('插件管理', () => {
  test('插件页面加载并展示全部分类', async ({ page }) => {
    await page.goto('/admin/plugins')
    await expect(page.getByRole('heading', { name: '插件管理' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '全部' })).toBeVisible()
  })
})
