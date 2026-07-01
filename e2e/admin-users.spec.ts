import { test, expect } from '@playwright/test'
import { getTokenFromPage } from './helpers'

test.describe('用户管理', () => {
  test('创建用户完整流程', async ({ page, request }) => {
    const username = `e2e_crud_${Date.now()}`

    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible()

    await page.getByRole('button', { name: '添加用户' }).click()
    await expect(page.getByText('添加用户')).toBeVisible()
    await page.getByLabel('用户名').fill(username)
    await page.getByLabel('邮箱').fill(`${username}@e2e.test`)
    await page.getByLabel('密码').fill('test_password_123')
    await page.getByRole('button', { name: '创建' }).click()
    await expect(page.getByText(username)).toBeVisible({ timeout: 10_000 })

    // 通过 API 清理
    const token = await getTokenFromPage(page)
    const listResp = await request.get(`/api/v1/admin/users?keyword=${username}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const listBody = await listResp.json()
    const user = listBody.data?.items?.find((u: { username: string }) => u.username === username)
    if (user) {
      await request.delete(`/api/v1/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  })

  test('用户列表展示表格', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText('用户名')).toBeVisible()
  })
})
