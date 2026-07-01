import { test, expect } from '@playwright/test'

test('操作日志页展示表格、搜索框和日期筛选', async ({ page }) => {
  await page.goto('/admin/logs')
  await expect(page.getByRole('heading', { name: '操作日志' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByPlaceholder(/搜索用户名/)).toBeVisible()
  await expect(page.locator('input[type="date"]')).toHaveCount(2)
})
