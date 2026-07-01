import { test, expect } from '@playwright/test'

test.describe('用户端个人资料', () => {
  test('个人资料页展示用户信息', async ({ page }) => {
    await page.goto('/portal/profile')
    await expect(page.getByRole('heading', { name: '个人资料' })).toBeVisible()
    await expect(page.getByText('用户名')).toBeVisible()
    await expect(page.getByText('注册时间')).toBeVisible()
  })

  test('修改密码区域可见', async ({ page }) => {
    await page.goto('/portal/profile')
    await expect(page.getByText('修改密码')).toBeVisible()
    await expect(page.getByLabel('当前密码')).toBeVisible()
    await expect(page.getByLabel('新密码')).toBeVisible()
  })

  test('修改密码时原密码错误显示提示', async ({ page }) => {
    await page.goto('/portal/profile')
    await page.getByLabel('当前密码').fill('wrong_old_password')
    await page.getByLabel('新密码').fill('new_password_123')
    await page.getByRole('button', { name: '修改密码' }).click()
    await expect(page.getByText(/修改失败|密码错误|原密码/)).toBeVisible({ timeout: 5_000 })
  })
})
