import { test, expect } from '@playwright/test'

test('集成方管理页展示表格、创建按钮并可打开表单', async ({ page }) => {
  await page.goto('/admin/integrations')
  await expect(page.getByRole('heading', { name: '集成方管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('button', { name: '新建集成方' }).click()
  await expect(page.getByText('新建集成方')).toBeVisible()
})
