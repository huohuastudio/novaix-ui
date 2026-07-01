import { test, expect } from '@playwright/test'

test('支付记录页展示表格和导出按钮', async ({ page }) => {
  await page.goto('/admin/payments')
  await expect(page.getByRole('heading', { name: '支付记录' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('button', { name: '导出' })).toBeVisible()
})
