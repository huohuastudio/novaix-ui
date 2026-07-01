import { test, expect } from '@playwright/test'

test('代理管理页展示标签页并可切换', async ({ page }) => {
  await page.goto('/admin/agents')
  await expect(page.getByRole('heading', { name: '代理管理' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '代理列表' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '代理分组' })).toBeVisible()

  await page.getByRole('tab', { name: '代理分组' }).click()
  await expect(page.getByRole('tab', { name: '代理分组' })).toHaveAttribute('data-state', 'active')
})
