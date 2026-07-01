import { test, expect } from '@playwright/test'

test('用户详情页：导航、标签页展示和切换', async ({ page }) => {
  await page.goto('/admin/users')
  await expect(page.getByRole('table')).toBeVisible()

  await page.getByPlaceholder(/搜索用户名/).fill('e2e_user')
  await page.getByPlaceholder(/搜索用户名/).press('Enter')
  await expect(page.getByText('e2e_user')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('link', { name: 'e2e_user' }).click()

  await expect(page).toHaveURL(/\/admin\/users\/\d+/)
  await expect(page.getByText('e2e_user')).toBeVisible()

  await expect(page.getByRole('tab', { name: '概览' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '个人资料' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '实例' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '订单' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '交易记录' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '工单' })).toBeVisible()

  await page.getByRole('tab', { name: '订单' }).click()
  await expect(page).toHaveURL(/\/admin\/users\/\d+\/orders/)
})
