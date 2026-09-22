import { test, expect } from '@playwright/test'
import { ADMIN_USER, ADMIN_PASS } from './helpers'

test.skip(process.env.E2E_COUPON_RECREATE !== '1', '需要显式启用专用测试环境')

test('优惠券删除后同码重建，保留有效券重复保护', async ({ page, request }) => {
  const code = `SYSTEMCOUPON${Date.now()}`
  const login = await request.post('/api/v1/login', { data: { username: ADMIN_USER, password: ADMIN_PASS } })
  const auth = (await login.json()).data
  expect(auth.token).toBeTruthy()
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }, auth)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/admin/coupons', { waitUntil: 'domcontentloaded' })
  const row = page.getByRole('row').filter({ hasText: code })
  const create = async () => {
    await page.getByRole('button', { name: '创建优惠券' }).first().click()
    await page.getByLabel('优惠码').fill(code)
    await page.getByLabel('面值').fill('10')
    const submitted = page.waitForResponse(r => r.url().endsWith('/admin/coupons') && r.request().method() === 'POST')
    await page.getByRole('button', { name: '创建', exact: true }).click()
    const response = await submitted
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.code).toBe(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(row).toBeVisible()
    return body.data.id as number
  }
  const remove = async () => {
    await row.getByRole('button').last().click()
    await page.getByRole('button', { name: '删除', exact: true }).click()
    await expect(row).toHaveCount(0)
  }
  let activeID: number | undefined
  try {
    const oldID = await create()
    activeID = oldID
    await remove()
    activeID = await create()
    expect(activeID).not.toBe(oldID)
    const headers = { Authorization: `Bearer ${auth.token}` }
    const duplicate = await request.post('/api/v1/admin/coupons', { headers, data: { code, type: 'fixed', value: 10, enabled: true } })
    expect(duplicate.status()).toBe(409)
    const old = await request.get(`/api/v1/admin/coupons/${oldID}`, { headers })
    expect(old.status()).toBe(404)
    await expect(row).toHaveCount(1)
    await page.screenshot({ path: test.info().outputPath('优惠券同码重建.png'), animations: 'disabled' })
    expect(errors).toEqual([])
  } finally {
    if (activeID) await request.delete(`/api/v1/admin/coupons/${activeID}`, { headers: { Authorization: `Bearer ${auth.token}` } })
  }
})
