import { test, expect } from '@playwright/test'

test.describe('管理后台仪表盘详细内容', () => {
  test('展示收入趋势、实例状态、资源使用、待处理、排行', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('收入趋势')).toBeVisible()
    await expect(page.getByText('实例状态')).toBeVisible()
    await expect(page.getByText('资源使用')).toBeVisible()
    await expect(page.getByText('待处理事项')).toBeVisible()
    await expect(page.getByText('节点资源排行')).toBeVisible()
  })
})
