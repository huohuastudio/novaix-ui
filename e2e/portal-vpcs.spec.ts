import { test, expect } from '@playwright/test'

test('用户端私有网络页面展示标题和创建按钮', async ({ page }) => {
  await page.goto('/portal/vpcs')
  await expect(page.getByRole('heading', { name: '私有网络' })).toBeVisible()
  await expect(page.getByRole('button', { name: /创建私有网络/ })).toBeVisible()
})
