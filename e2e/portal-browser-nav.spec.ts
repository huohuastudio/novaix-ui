import { test, expect } from '@playwright/test'

test.describe('用户端浏览器导航', () => {
  test('前进后退按钮正常工作', async ({ page }) => {
    await page.goto('/portal')
    await expect(page.getByText('云服务器')).toBeVisible()

    // 导航到订单页
    await page.getByRole('link', { name: '费用订单' }).click()
    await expect(page).toHaveURL(/\/portal\/orders/)

    // 导航到工单页
    await page.getByRole('link', { name: '工单' }).click()
    await expect(page).toHaveURL(/\/portal\/tickets/)

    // 浏览器后退
    await page.goBack()
    await expect(page).toHaveURL(/\/portal\/orders/)

    // 浏览器前进
    await page.goForward()
    await expect(page).toHaveURL(/\/portal\/tickets/)
  })

  test('页面 title 随导航更新', async ({ page }) => {
    await page.goto('/portal/orders')
    await expect(page).toHaveTitle(/费用订单/)
  })
})
