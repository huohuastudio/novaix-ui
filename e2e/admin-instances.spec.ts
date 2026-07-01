import { test, expect } from '@playwright/test'

test('实例管理页展示标题和创建链接', async ({ page }) => {
  await page.goto('/admin/instances')
  await expect(page.getByRole('heading', { name: '实例管理' })).toBeVisible()
  await page.getByRole('link', { name: '创建实例' }).click()
  await expect(page).toHaveURL(/\/admin\/instances\/create/)
})
