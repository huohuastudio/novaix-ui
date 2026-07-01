import { test, expect } from '@playwright/test'

test('用户端通知页展示标题和操作按钮', async ({ page }) => {
  await page.goto('/portal/notifications')
  await expect(page.getByRole('heading', { name: '通知' })).toBeVisible()
  await expect(page.getByRole('button', { name: '仅未读' })).toBeVisible()
  await expect(page.getByRole('button', { name: '全部已读' })).toBeVisible()
})
