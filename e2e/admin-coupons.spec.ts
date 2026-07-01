import { test, expect } from '@playwright/test'

test.describe('优惠券管理', () => {
  test('创建并删除优惠券完整流程', async ({ page }) => {
    const code = `E2E${Date.now()}`

    await page.goto('/admin/coupons')
    await expect(page.getByRole('heading', { name: '优惠券管理' })).toBeVisible()

    // 创建优惠券
    await page.getByRole('button', { name: '创建优惠券' }).click()
    await expect(page.getByText('创建优惠券')).toBeVisible()
    await page.getByLabel('优惠码').fill(code)
    await page.getByLabel('面值').fill('10')
    await page.getByRole('button', { name: '创建' }).click()
    await expect(page.getByText(code)).toBeVisible({ timeout: 10_000 })

    // 删除优惠券
    const row = page.locator('tr', { hasText: code })
    await row.getByRole('button').last().click()
    await expect(page.getByText('删除优惠券')).toBeVisible()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByText(code)).not.toBeVisible({ timeout: 10_000 })
  })
})
