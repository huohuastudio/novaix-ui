import { test, expect } from '@playwright/test'

test.describe('重置密码页', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('重置密码页展示表单', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('输入账号找回密码')).toBeVisible()
    await expect(page.getByLabel('邮箱')).toBeVisible()
    await expect(page.getByRole('button', { name: '发送验证码' })).toBeVisible()
  })
})
