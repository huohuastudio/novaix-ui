import { test, expect } from '@playwright/test'

test('任务管理页展示表格和清理按钮', async ({ page }) => {
  await page.goto('/admin/tasks')
  await expect(page.getByRole('heading', { name: '任务管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('button', { name: '清理已完成' })).toBeVisible()
})
