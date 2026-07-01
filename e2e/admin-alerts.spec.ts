import { test, expect } from '@playwright/test'

test('告警记录页展示表格和类型筛选器', async ({ page }) => {
  await page.goto('/admin/alerts')
  await expect(page.getByRole('heading', { name: '告警记录' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()

  await page.getByRole('combobox').click()
  await expect(page.getByText('CPU 使用率')).toBeVisible()
  await expect(page.getByText('内存使用率')).toBeVisible()
  await expect(page.getByText('磁盘使用率')).toBeVisible()
  await expect(page.getByText('节点离线')).toBeVisible()
})
