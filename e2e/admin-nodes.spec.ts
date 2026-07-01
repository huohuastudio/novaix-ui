import { test, expect } from '@playwright/test'

test('节点管理页展示表格、添加按钮并可打开表单', async ({ page }) => {
  await page.goto('/admin/nodes')
  await expect(page.getByRole('heading', { name: '节点管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('button', { name: '添加节点' }).click()
  await expect(page.getByText(/添加节点|创建节点/)).toBeVisible()
})
