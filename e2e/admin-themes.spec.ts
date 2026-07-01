import { test, expect } from '@playwright/test'

test.describe('主题管理', () => {
  test('主题页面展示已安装和市场标签页', async ({ page }) => {
    await page.goto('/admin/themes')
    await expect(page.getByRole('heading', { name: '主题管理' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '已安装' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '主题市场' })).toBeVisible()
  })

  test('切换到主题市场标签页', async ({ page }) => {
    await page.goto('/admin/themes')
    await page.getByRole('tab', { name: '主题市场' }).click()
    await expect(page.getByRole('tab', { name: '主题市场' })).toHaveAttribute('data-state', 'active')
  })
})
