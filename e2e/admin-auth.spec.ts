import { test, expect } from '@playwright/test'
import { ADMIN_USER, ADMIN_PASS } from './helpers'

test.describe('管理后台认证', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('未登录访问后台自动跳转到登录页', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 })
  })

  test('登录页展示完整表单', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByLabel('用户名')).toBeVisible()
    await expect(page.getByLabel('密码')).toBeVisible()
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible()
  })

  test('错误密码显示提示', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('用户名').fill('admin')
    await page.getByLabel('密码').fill('wrongpassword')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page.getByText('账号或密码错误')).toBeVisible({ timeout: 5_000 })
  })

  test('管理员登录成功跳转仪表盘', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('用户名').fill(ADMIN_USER)
    await page.getByLabel('密码').fill(ADMIN_PASS)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 })
  })
})
