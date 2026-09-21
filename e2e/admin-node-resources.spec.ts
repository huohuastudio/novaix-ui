import { test, expect, type Page } from '@playwright/test'

// 节点数据和写入均在独立浏览器上下文内模拟，不操作真实节点。
test.use({ storageState: { cookies: [], origins: [] }, headless: true, timezoneId: 'Asia/Shanghai' })
const fingerprint = '72ddecfadc1a5446368caf9396b445832b0da8168b1b248588e50300376a58dd'

async function mockNode(page: Page, imageError?: string) {
  const writes: Array<{ method: string; path: string; body: Record<string, unknown> | null }> = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('token', 'system-test')
    localStorage.setItem('user', JSON.stringify({ id: 1, username: '系统测试', role: 'admin' }))
  })
  let images = [{ fingerprint, type: 'container', architecture: 'x86_64', size: 1024, uploaded_at: '2026-09-20T00:00:00Z', properties: { description: '系统测试镜像' }, aliases: [] }]
  let profiles = [{ name: 'custom', description: '系统测试配置', config: { 'security.nesting': 'false' }, devices: { root: { type: 'disk', path: '/', pool: 'local', 'io.cache': 'writeback' } }, used_by: [] }]
  let volumes = [{ name: 'data', type: 'custom', content_type: 'filesystem', config: { size: '10GiB' }, used_by: [] }]
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()
    if (path.includes('/proxy/')) {
      expect(method, '通用代理只允许读取').toBe('GET')
      const resource = path.split('/proxy/')[1]
      let metadata: unknown = {}
      if (resource === '1.0/images') metadata = images
      if (resource === '1.0/profiles') metadata = profiles
      if (resource.startsWith('1.0/profiles/')) metadata = profiles.find(p => p.name === resource.split('/').at(-1))
      if (resource === '1.0/storage-pools') metadata = [{ name: 'local', driver: 'dir', status: 'Created', config: {}, used_by: [] }]
      if (resource === '1.0/networks') metadata = [{ name: 'br0', type: 'bridge', managed: true, config: {} }]
      if (resource.endsWith('/volumes')) metadata = volumes
      await route.fulfill({ json: { type: 'sync', status_code: 200, metadata } })
      return
    }
    if (method !== 'GET') {
      const body = request.postData() ? request.postDataJSON() : null
      writes.push({ method, path, body })
      if (path === `/admin/nodes/5/images/${fingerprint}`) {
        if (imageError) {
          await route.fulfill({ status: 409, json: { code: 10409, message: imageError } })
          return
        }
        images = []
      }
      if (path === '/admin/nodes/5/profiles' && method === 'POST') profiles.push({ ...body, used_by: [] })
      if (path === '/admin/nodes/5/profiles/custom' && method === 'PUT') profiles[0] = { ...profiles[0], ...body }
      if (path === '/admin/nodes/5/profiles/custom' && method === 'DELETE') profiles = profiles.filter(p => p.name !== 'custom')
      if (path === '/admin/nodes/5/storage-pools/local/volumes' && method === 'POST') volumes.push({ ...body, type: 'custom', config: { size: body.size }, used_by: [] })
      if (path === '/admin/nodes/5/storage-pools/local/volumes/data' && method === 'DELETE') volumes = volumes.filter(v => v.name !== 'data')
      await route.fulfill({ json: { code: 0, message: 'ok' } })
      return
    }
    let data: unknown = { items: [], total: 0 }
    if (path === '/admin/nodes/5') data = { id: 5, name: '系统测试节点', host: '192.0.2.5', status: 1, arch: 'amd64', storage_pool: 'local', network_name: 'br0' }
    if (path === '/admin/tasks/active') data = []
    await route.fulfill({ json: { code: 0, message: 'ok', data } })
  })
  return { writes, errors }
}

async function confirmDelete(page: Page) {
  await page.getByRole('alertdialog').getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.getByRole('alertdialog')).not.toBeVisible()
}

test('节点镜像使用专用接口删除缓存并刷新列表', async ({ page }, testInfo) => {
  const state = await mockNode(page)
  await page.goto('/admin/nodes/5/images', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '删除镜像缓存' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('不会删除镜像模板或已有实例')
  await confirmDelete(page)
  await expect(page.getByText('镜像缓存已删除', { exact: true })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: '系统测试镜像' })).toHaveCount(0)
  expect(state.writes).toEqual([{ method: 'DELETE', path: `/admin/nodes/5/images/${fingerprint}`, body: null }])
  expect(state.errors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('image-cache-deleted.png'), fullPage: true })
})

test('资源冲突显示具体原因，不出现权限误报或重复提示', async ({ page }, testInfo) => {
  const message = '该镜像正在被任务使用，请等待相关任务完成后再清理'
  await mockNode(page, message)
  await page.goto('/admin/nodes/5/images', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '删除镜像缓存' }).click()
  await confirmDelete(page)
  await expect(page.getByText(message, { exact: true })).toHaveCount(1)
  await expect(page.getByText('权限不足，无法执行此操作', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('row').filter({ hasText: '系统测试镜像' })).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('image-cache-conflict.png'), fullPage: true })
})

test('配置文件创建、编辑和删除均使用专用接口', async ({ page }) => {
  const state = await mockNode(page)
  await page.goto('/admin/nodes/5/profiles', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '创建配置文件', exact: true }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel(/^配置文件名称/).fill('system-test')
  await sheet.getByRole('button', { name: '创建配置文件', exact: true }).click()
  await expect(sheet).not.toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'system-test' })).toHaveCount(1)
  const row = page.getByRole('row').filter({ hasText: 'custom' })
  await row.getByRole('button', { name: '编辑配置文件' }).click()
  await sheet.getByLabel('描述', { exact: true }).fill('更新说明')
  await sheet.getByRole('button', { name: '保存修改', exact: true }).click()
  await expect(sheet).not.toBeVisible()
  await expect(row).toContainText('更新说明')
  await row.getByRole('button', { name: '删除配置文件' }).click()
  await confirmDelete(page)
  await expect(row).toHaveCount(0)
  expect(state.writes.map(({ method, path }) => `${method} ${path}`)).toEqual([
    'POST /admin/nodes/5/profiles', 'PUT /admin/nodes/5/profiles/custom', 'DELETE /admin/nodes/5/profiles/custom',
  ])
  expect(state.writes[1].body).toEqual({
    description: '更新说明',
    config: { 'security.nesting': 'false' },
    devices: { root: { type: 'disk', path: '/', pool: 'local', 'io.cache': 'writeback' } },
  })
  expect(state.errors).toEqual([])
})

test('独立配置文件创建页使用专用接口', async ({ page }) => {
  const state = await mockNode(page)
  await page.goto('/admin/profiles/create?node_id=5', { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/^配置文件名称/).fill('system-test')
  await page.getByRole('button', { name: '创建配置文件', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/nodes\/5\/profiles$/)
  expect(state.writes[0]).toMatchObject({ method: 'POST', path: '/admin/nodes/5/profiles', body: { name: 'system-test' } })
  expect(state.errors).toEqual([])
})

test('自定义卷创建和删除使用专用接口并刷新列表', async ({ page }) => {
  const state = await mockNode(page)
  await page.goto('/admin/nodes/5/storage', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '创建卷', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/名称/).fill('system-test')
  await dialog.getByRole('button', { name: '创建', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'system-test' })).toHaveCount(1)
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'data', exact: true }) })
  await row.getByRole('button', { name: '删除存储卷' }).click()
  await confirmDelete(page)
  await expect(row).toHaveCount(0)
  expect(state.writes).toEqual([
    { method: 'POST', path: '/admin/nodes/5/storage-pools/local/volumes', body: { name: 'system-test', size: '10GiB', content_type: 'filesystem' } },
    { method: 'DELETE', path: '/admin/nodes/5/storage-pools/local/volumes/data', body: null },
  ])
  expect(state.errors).toEqual([])
})
