import { test, expect } from '@playwright/test'
import { ADMIN_USER, ADMIN_PASS } from './helpers'

// 仅显式指定专用测试实例时执行，重建会清空其系统盘。
const instanceID = process.env.E2E_REBUILD_INSTANCE_ID
const instanceName = process.env.E2E_REBUILD_INSTANCE_NAME ?? ''
test.skip(!instanceID || !instanceName, '需要显式配置专用重建测试实例')

test('后台重建确认、移动端布局与真实任务完成', async ({ page, request }) => {
  test.setTimeout(240_000)
  expect(instanceName).toMatch(/^系统测试/)
  const login = await request.post('/api/v1/login', { data: { username: ADMIN_USER, password: ADMIN_PASS } })
  const auth = (await login.json()).data
  expect(auth.token).toBeTruthy()
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }, auth)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/admin/instances', { waitUntil: 'domcontentloaded' })
  const row = page.getByRole('row').filter({ hasText: instanceName })
  await row.getByRole('button', { name: '重建', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('checkbox', { name: /同时删除原有快照/ }).check()
  await expect(page.getByRole('button', { name: '确认重建' })).toBeDisabled()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto(`/admin/instances/${instanceID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: instanceName })).toBeVisible()
  await page.getByRole('button', { name: '重建', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认重建' })).toBeDisabled()
  await page.getByLabel(/输入实例名称确认/).fill('名称不匹配')
  await expect(page.getByRole('button', { name: '确认重建' })).toBeDisabled()
  await page.screenshot({ path: test.info().outputPath('重建-桌面.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: test.info().outputPath('重建-手机.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByLabel(/输入实例名称确认/).fill(instanceName)
  const submitted = page.waitForResponse(response => response.url().endsWith(`/instances/${instanceID}/rebuild`) && response.request().method() === 'POST')
  await page.getByRole('button', { name: '确认重建' }).click()
  const body = await (await submitted).json()
  expect(body.code).toBe(0)
  expect(body.data.task_id).toBeTruthy()
  await expect(dialog).toHaveCount(0)
  // 等待任务结束后读回实例；任务成功与实例运行状态必须同时满足。
  const headers = { Authorization: `Bearer ${auth.token}` }
  await expect.poll(async () => {
    const response = await request.get(`/api/v1/admin/tasks?instance_id=${instanceID}&page_size=100`, { headers })
    const result = await response.json()
    return result.data?.items?.find((item: { id: number }) => item.id === body.data.task_id)?.status
  }, { timeout: 180_000, intervals: [1000, 2000, 3000] }).toBe('completed')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '重建', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
  await page.screenshot({ path: test.info().outputPath('重建-完成.png'), animations: 'disabled' })
})
