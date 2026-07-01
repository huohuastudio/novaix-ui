import { test, expect } from '@playwright/test'

test.describe('用户端移动端适配', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('移动端菜单展开、导航、关闭', async ({ page }) => {
    await page.goto('/portal')
    const menuBtn = page.locator('button', { has: page.locator('svg.lucide-menu') })
    await expect(menuBtn).toBeVisible()

    await menuBtn.click()
    await expect(page.getByRole('link', { name: '云服务器' })).toBeVisible()
    await expect(page.getByRole('link', { name: '费用订单' })).toBeVisible()

    await page.getByRole('link', { name: '工单' }).click()
    await expect(page).toHaveURL(/\/portal\/tickets/)
    await expect(menuBtn).toBeVisible()
  })
})
