import { test, expect } from '@playwright/test'

test('用户端选购页展示标题和套餐区域', async ({ page }) => {
  await page.goto('/portal/purchase')
  await expect(page.getByRole('heading', { name: '选购云服务器' })).toBeVisible()
  await expect(page.getByText(/选择套餐|暂无可用套餐/)).toBeVisible({ timeout: 10_000 })
})
