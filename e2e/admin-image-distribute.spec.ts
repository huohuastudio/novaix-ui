import { test, expect, type Page } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] }, headless: true, timezoneId: 'Asia/Shanghai' })

async function mockDistribution(page: Page, conflict: boolean) {
  const writes: Array<{ force: boolean; node_ids: number[] }> = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('token', 'system-test')
    localStorage.setItem('user', JSON.stringify({ id: 1, username: '系统测试', role: 'admin' }))
  })
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    if (path === '/admin/images/1/distribute') {
      const body = route.request().postDataJSON()
      writes.push(body)
      if (conflict && !body.force) {
        await route.fulfill({ status: 409, json: { code: 20406, message: '目标节点上已存在该镜像' } })
      } else {
        await route.fulfill({ json: { code: 0, data: [712] } })
      }
      return
    }
    let data: unknown = { items: [], total: 0 }
    if (path === '/admin/images') data = { items: [{ id: 1, name: '系统测试镜像', type: 'container', os: 'Ubuntu', version: '24.04', arch: 'amd64', download_status: 'completed', status: 1 }], total: 1 }
    if (path === '/admin/nodes') data = { items: [{ id: 13, name: '系统测试节点', host: '192.0.2.13', status: 1 }], total: 1 }
    if (path === '/admin/tasks/active' || path === '/admin/image-groups') data = []
    await route.fulfill({ json: { code: 0, message: 'ok', data } })
  })
  return { writes, errors }
}

async function selectNodeAndSubmit(page: Page) {
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox', { name: /系统测试节点/ }).check()
  await dialog.getByRole('button', { name: '分发到 1 个节点' }).click()
}

test('镜像冲突后可点击覆盖分发，正常成功路径保持可用', async ({ page }, testInfo) => {
  const state = await mockDistribution(page, true)
  await page.goto('/admin/images', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '分发到节点', exact: true }).click()
  await selectNodeAndSubmit(page)
  await expect(page.getByRole('button', { name: '覆盖分发' })).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.screenshot({ path: testInfo.outputPath('distribution-conflict.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '覆盖分发' }).click()
  await expect(page.getByText('已创建 1 个分发任务', { exact: true })).toBeVisible()
  expect(state.writes).toEqual([{ node_ids: [13], force: false }, { node_ids: [13], force: true }])
  expect(state.errors).toEqual([])
})

test('节点镜像已删除时直接分发成功', async ({ page }) => {
  const state = await mockDistribution(page, false)
  await page.goto('/admin/images', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '分发到节点', exact: true }).click()
  await selectNodeAndSubmit(page)
  await expect(page.getByText('已创建 1 个分发任务', { exact: true })).toBeVisible()
  expect(state.writes).toEqual([{ node_ids: [13], force: false }])
  expect(state.errors).toEqual([])
})

test('批量分发正确识别 409 并覆盖重试', async ({ page }) => {
  const state = await mockDistribution(page, true)
  await page.goto('/admin/images', { waitUntil: 'domcontentloaded' })
  await page.getByRole('row').filter({ hasText: '系统测试镜像' }).getByRole('checkbox').check()
  await page.getByRole('button', { name: /批量分发/ }).click()
  await selectNodeAndSubmit(page)
  await page.getByRole('button', { name: '覆盖分发' }).click()
  await expect(page.getByText('已创建 1 个覆盖分发任务', { exact: true })).toBeVisible()
  expect(state.writes).toEqual([{ node_ids: [13], force: false }, { node_ids: [13], force: true }])
  expect(state.errors).toEqual([])
})
