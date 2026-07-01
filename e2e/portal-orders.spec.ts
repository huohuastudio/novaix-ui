import { test, expect } from '@playwright/test'

test('用户端订单页展示标题和状态筛选器', async ({ page }) => {
  await page.goto('/portal/orders')
  await expect(page.getByRole('heading', { name: '费用订单' })).toBeVisible()

  await page.getByRole('combobox').click()
  await expect(page.getByText('全部状态')).toBeVisible()
  await expect(page.getByText('待支付')).toBeVisible()
  await expect(page.getByText('已支付')).toBeVisible()
  await expect(page.getByText('已取消')).toBeVisible()
})
