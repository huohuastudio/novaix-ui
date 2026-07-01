import { test, expect } from '@playwright/test'
import { ADMIN_USER, ADMIN_PASS } from './helpers'

test.describe('用户端认证', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('未登录访问门户自动跳转到登录页', async ({ page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/\/login/)
  })

  test('登录页展示完整表单', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('账号')).toBeVisible()
    await expect(page.getByLabel('密码')).toBeVisible()
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible()
  })

  test('错误密码显示提示', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('账号').fill('admin')
    await page.getByLabel('密码').fill('wrongpassword')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page.getByText('账号或密码错误')).toBeVisible({ timeout: 5_000 })
  })

  test('管理员登录成功跳转门户', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('账号').fill(ADMIN_USER)
    await page.getByLabel('密码').fill(ADMIN_PASS)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/portal/, { timeout: 10_000 })
  })

  test('登录页有忘记密码链接', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: '忘记密码' }).click()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('空表单提交不发请求', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
