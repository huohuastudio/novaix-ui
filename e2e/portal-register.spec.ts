import { test, expect } from '@playwright/test'

test.describe('用户注册页', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('注册页展示完整表单', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('创建新账户')).toBeVisible()
    await expect(page.getByLabel('用户名')).toBeVisible()
    await expect(page.getByLabel('邮箱')).toBeVisible()
    await expect(page.getByLabel('密码', { exact: true })).toBeVisible()
    await expect(page.getByLabel('确认密码')).toBeVisible()
  })

  test('密码不一致时提示错误', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('用户名').fill('test_mismatch')
    await page.getByLabel('邮箱').fill('mismatch@test.com')
    await page.getByLabel('密码', { exact: true }).fill('password123')
    await page.getByLabel('确认密码').fill('different456')
    await page.getByRole('button', { name: /注册|下一步/ }).click()
    await expect(page.getByText('两次输入的密码不一致')).toBeVisible({ timeout: 5_000 })
  })

  test('已有账号链接可跳转到登录页', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('link', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
