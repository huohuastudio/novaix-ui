import { test, expect } from '@playwright/test'

test('用户端钱包页展示余额、充值按钮和交易记录', async ({ page }) => {
  await page.goto('/portal/wallet')
  await expect(page.getByRole('heading', { name: '钱包' })).toBeVisible()
  await expect(page.getByText('账户余额')).toBeVisible()
  await expect(page.getByRole('button', { name: '充值' })).toBeVisible()
  await expect(page.getByText('交易记录')).toBeVisible()
})
