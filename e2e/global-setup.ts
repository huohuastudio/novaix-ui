import { test as setup, expect } from '@playwright/test'
import { ADMIN_USER, ADMIN_PASS, getTokenFromPage } from './helpers'

const PORTAL_USER = 'e2e_user'
const PORTAL_PASS = 'e2e_pass_123456'

setup('管理员登录并保存认证状态', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASS)
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 })

  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})

setup('创建普通用户并保存认证状态', async ({ page, request }) => {
  await page.goto('/admin/login')
  await page.getByLabel('用户名').fill(ADMIN_USER)
  await page.getByLabel('密码').fill(ADMIN_PASS)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 })

  const token = await getTokenFromPage(page)
  const headers = { Authorization: `Bearer ${token}` }

  const createResp = await request.post('/api/v1/admin/users', {
    headers,
    data: {
      username: PORTAL_USER,
      email: `${PORTAL_USER}@e2e.test`,
      password: PORTAL_PASS,
      role: 'user',
      status: 1,
    },
  })
  const createBody = await createResp.json()

  if (createBody.code === 20101) {
    const listResp = await request.get(`/api/v1/admin/users?keyword=${PORTAL_USER}`, { headers })
    const listBody = await listResp.json()
    const user = listBody.data?.items?.find((u: { username: string }) => u.username === PORTAL_USER)
    expect(user).toBeTruthy()

    await request.put(`/api/v1/admin/users/${user.id}`, {
      headers,
      data: { password: PORTAL_PASS, role: 'user', status: 1 },
    })
  } else {
    expect(createBody.code).toBe(0)
  }

  const portalContext = await page.context().browser()!.newContext()
  const portalPage = await portalContext.newPage()
  await portalPage.goto('/login')
  await portalPage.getByLabel('账号').fill(PORTAL_USER)
  await portalPage.getByLabel('密码').fill(PORTAL_PASS)
  await portalPage.getByRole('button', { name: '登录' }).click()
  await expect(portalPage).toHaveURL(/\/portal/, { timeout: 10_000 })

  await portalContext.storageState({ path: 'e2e/.auth/user.json' })
  await portalContext.close()
})
