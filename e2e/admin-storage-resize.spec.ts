import { test, expect } from '@playwright/test'
import { ADMIN_USER, ADMIN_PASS } from './helpers'

// 仅在显式指定的专用测试池上执行真实扩容。
const nodeID = process.env.E2E_STORAGE_NODE_ID
const pool = process.env.E2E_STORAGE_POOL ?? ''
test.skip(!nodeID || !pool, '需要指定专用存储池')

test('存储扩容边界、移动端布局与真实容量刷新', async ({ page, request }) => {
  test.setTimeout(180_000)
  expect(pool).toMatch(/^system-/)
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
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText ?? ''
    if (!failure.includes('ERR_ABORTED')) errors.push(`${new URL(request.url()).pathname}: ${failure}`)
  })
  await page.goto(`/admin/nodes/${nodeID}/storage`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: pool, exact: true })).toBeVisible()
  await page.getByRole('button', { name: '扩容', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const input = page.getByLabel('目标容量（GiB）')
  await expect(input).toBeVisible({ timeout: 40_000 })
  const target = Number(await input.getAttribute('min'))
  expect(target).toBeGreaterThan(1)
  await input.fill('1')
  await expect(page.getByRole('button', { name: '确认扩容' })).toBeDisabled()
  await input.fill('999999')
  await expect(page.getByRole('button', { name: '确认扩容' })).toBeDisabled()
  await input.fill(String(target))
  await expect(page.getByRole('button', { name: '确认扩容' })).toBeEnabled()
  await page.screenshot({ path: test.info().outputPath('存储扩容-桌面.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  const bounds = await dialog.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: test.info().outputPath('存储扩容-手机.png'), animations: 'disabled' })
  const submitted = page.waitForResponse(r => r.url().endsWith(`/storage-pools/${pool}/resize`) && r.request().method() === 'POST')
  await page.getByRole('button', { name: '确认扩容' }).click()
  const response = await submitted
  expect(response.status()).toBe(200)
  const result = await response.json()
  expect(result.code).toBe(0)
  expect(result.data.current_size_bytes).toBe(target * 1024 ** 3)
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText(`${target}GiB`, { exact: true })).toBeVisible({ timeout: 40_000 })
  // 配置更新和实际用量查询分别刷新，等待用量区域也显示服务端核实的容量。
  const totalGB = (result.data.pool_total_bytes / 1024 ** 3).toFixed(1)
  await expect(page.getByText(new RegExp(`/ ${totalGB.replace('.', '\\.')} GB`))).toBeVisible({ timeout: 40_000 })
  await page.screenshot({ path: test.info().outputPath('存储扩容-完成.png'), animations: 'disabled' })
  expect(errors).toEqual([])
})
