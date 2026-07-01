import { test, expect } from '@playwright/test'

test.describe('关于页面', () => {
  test('概览标签页展示系统信息', async ({ page }) => {
    await page.goto('/admin/about')
    await expect(page.getByRole('heading', { name: '关于' })).toBeVisible()
    await expect(page.getByText('系统信息')).toBeVisible()
    await expect(page.getByText('授权信息')).toBeVisible()
  })

  test('切换到系统更新标签页', async ({ page }) => {
    await page.goto('/admin/about')
    await page.getByRole('tab', { name: '系统更新' }).click()
    await expect(page.getByText('更新日志')).toBeVisible({ timeout: 10_000 })
  })
})
