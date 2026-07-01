import { test, expect } from '@playwright/test'

test.describe('权限隔离', () => {
  test('普通用户访问管理后台被重定向到管理员登录页', async ({ page }) => {
    // portal project 使用普通用户的 storageState
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10_000 })
  })

  test('普通用户带 token 访问管理后台 API 返回 403', async ({ page, request }) => {
    // 从 localStorage 取出普通用户的 token
    await page.goto('/portal')
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()

    const resp = await request.get('/api/v1/admin/ping', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(resp.status()).toBe(403)
  })
})
