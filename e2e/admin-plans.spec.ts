import { test, expect } from '@playwright/test'

test('套餐管理页展示表格、添加按钮并可打开表单', async ({ page }) => {
  await page.goto('/admin/plans')
  await expect(page.getByRole('heading', { name: '套餐管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('button', { name: '添加套餐' }).click()
  await expect(page.getByText(/创建套餐|添加套餐/)).toBeVisible()
})
