import { test, expect } from '@playwright/test'

test('管理后台工单列表展示表格、搜索框和筛选器', async ({ page }) => {
  await page.goto('/admin/tickets')
  await expect(page.getByRole('heading', { name: '工单管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByPlaceholder('搜索标题...')).toBeVisible()
  const comboboxes = page.getByRole('combobox')
  expect(await comboboxes.count()).toBeGreaterThanOrEqual(1)
})
