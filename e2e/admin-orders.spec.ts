import { test, expect } from '@playwright/test'

test('订单管理页展示表格、筛选器和搜索', async ({ page }) => {
  await page.goto('/admin/orders')
  await expect(page.getByRole('heading', { name: '订单管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByPlaceholder('搜索订单号/用户名...')).toBeVisible()
})
