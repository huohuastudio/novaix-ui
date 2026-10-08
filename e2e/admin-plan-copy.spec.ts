import { test, expect } from '@playwright/test'
import fs from 'node:fs'

// 夹具提供两个地区的测试节点和可开通镜像，仅在独立集成环境中启用。
const fixturePath = process.env.E2E_PLAN_COPY_FIXTURE

test('复制套餐保持配置、独立库存和地区限制', async ({ browser }) => {
  test.skip(!fixturePath, '需要配置 E2E_PLAN_COPY_FIXTURE')
  test.setTimeout(300_000)
  const f = JSON.parse(fs.readFileSync(fixturePath!, 'utf8'))
  const base = process.env.E2E_BASE_URL || 'http://localhost:8080'
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  try {
    const login = await context.request.post(`${base}/api/v1/login`, { data: { username: 'admin', password: f.adminPassword } })
    const auth = (await login.json()).data
    expect(auth?.token).toBeTruthy()
    const headers = { Authorization: `Bearer ${auth.token}` }
    const getPlan = async (id: number) => (await (await context.request.get(`${base}/api/v1/admin/plans/${id}`, { headers })).json()).data
    const listPlans = async () => (await (await context.request.get(`${base}/api/v1/admin/plans`, { headers })).json()).data
    const original = await getPlan(f.planID)
    const before = await listPlans()
    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    }, auth)
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) errors.push(request.failure()?.errorText || request.url()) })
    await page.goto(`${base}/admin/plans`, { waitUntil: 'domcontentloaded' })
    const dialog = page.getByRole('dialog')
    const openCopy = async () => {
      await page.getByRole('row').filter({ has: page.getByText(original.name, { exact: true }) }).getByRole('button', { name: '更多操作' }).click()
      await page.getByRole('menuitem', { name: '复制套餐', exact: true }).click()
      await expect(dialog.getByPlaceholder('基础型 1核1G')).toHaveValue(`${original.name}（副本）`)
    }
    await openCopy()
    await expect(dialog.getByLabel('库存', { exact: true })).toHaveValue('0')
    await expect(dialog.getByLabel('状态', { exact: true })).toContainText('下架')
    await expect(dialog.getByLabel('月付 (分)', { exact: true })).toHaveValue(String(original.price_monthly))
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('plan-copy-desktop.png') })
    await page.setViewportSize({ width: 390, height: 844 })
    const bounds = await dialog.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391)
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('plan-copy-mobile.png') })
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    expect((await listPlans()).total).toBe(before.total)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await openCopy()
    const creating = page.waitForResponse(r => r.url().endsWith('/api/v1/admin/plans') && r.request().method() === 'POST')
    await dialog.getByRole('button', { name: '创建', exact: true }).click()
    const created = await (await creating).json()
    expect(created.code).toBe(0)
    const copyID = created.data.id
    expect(copyID).not.toBe(original.id)
    const copy = await getPlan(copyID)
    expect(copy).toMatchObject({ stock: 0, status: 0 })
    expect(copy.enabled_cycles).toBe(original.enabled_cycles || 'hourly,monthly,quarterly,yearly')
    for (const key of ['description', 'type', 'cpu', 'memory', 'disk', 'bandwidth', 'traffic', 'ip_count', 'arch', 'profile_name', 'storage_pool', 'network_name', 'price_hourly', 'price_monthly', 'price_quarterly', 'price_yearly', 'extra_ip_price', 'max_extra_ips', 'nat_mode', 'ipv6_enabled', 'nat_port_mode', 'port_count', 'cpu_allowance', 'require_kyc', 'refund_enabled', 'refund_window_hours', 'refund_traffic_limit', 'refund_max_count', 'node_ids', 'image_ids', 'sort_order']) {
      expect(copy[key], key).toEqual(original[key])
    }
    expect(await getPlan(original.id)).toEqual(original)
    await expect(dialog).toHaveCount(0)
    const copyRow = page.getByRole('row').filter({ has: page.getByText(copy.name, { exact: true }) })
    await copyRow.getByRole('button', { name: '编辑套餐', exact: true }).click()
    await dialog.getByPlaceholder('基础型 1核1G').fill('系统测试地区 B 套餐')
    await dialog.getByLabel('库存', { exact: true }).fill('1')
    await dialog.getByLabel('状态', { exact: true }).click()
    await page.getByRole('option', { name: '上架', exact: true }).click()
    const nodes = dialog.getByRole('combobox').filter({ hasText: '系统测试节点' })
    await nodes.click()
    await page.getByRole('option').filter({ has: page.getByText('系统测试节点', { exact: true }) }).click()
    await page.getByRole('option').filter({ has: page.getByText('系统测试节点 B', { exact: true }) }).click()
    await page.keyboard.press('Escape')
    const saving = page.waitForResponse(r => r.url().endsWith(`/api/v1/admin/plans/${copyID}`) && r.request().method() === 'PUT')
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    expect((await (await saving).json()).code).toBe(0)
    expect(await getPlan(copyID)).toMatchObject({ stock: 1, status: 1, node_ids: String(f.nodeBID) })
    expect(await getPlan(original.id)).toEqual(original)
    await expect(dialog).toHaveCount(0)
    // 复制后的普通新建入口必须恢复默认值，不能残留源套餐数据。
    await page.getByRole('button', { name: '添加套餐', exact: true }).first().click()
    await expect(dialog.getByPlaceholder('基础型 1核1G')).toHaveValue('')
    await expect(dialog.getByLabel('库存', { exact: true })).toHaveValue('-1')
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    const order = async (planID: number, nodeID: number, autoPay = true) => {
      const r = await context.request.post(`${base}/api/v1/admin/orders`, { headers, data: { user_id: f.userID, plan_id: planID, node_id: nodeID, image_id: f.imageID, password: f.password, billing_cycle: 'monthly', auto_pay: autoPay } })
      return r.json()
    }
    const wrongNode = await order(copyID, f.nodeID)
    expect(wrongNode.code).not.toBe(0)
    expect(wrongNode.message).toContain('节点')
    for (const [planID, nodeID] of [[original.id, f.nodeID], [copyID, f.nodeBID]]) {
      const result = await order(planID, nodeID)
      expect(result.code).toBe(0)
      expect(result.data.status).toBe('paid')
      await expect.poll(async () => {
        const response = await context.request.get(`${base}/api/v1/admin/orders/${result.data.id}`, { headers })
        return (await response.json()).data.fulfillment_status
      }, { timeout: 150_000, intervals: [2000] }).toBe('completed')
    }
    expect((await getPlan(original.id)).stock).toBe(original.stock - 1)
    expect((await getPlan(copyID)).stock).toBe(0)
    expect((await order(copyID, f.nodeBID)).code).not.toBe(0)
    expect((await order(original.id, f.nodeID, false)).code).toBe(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('系统测试地区 B 套餐', { exact: true })).toBeVisible()
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('plan-copy-independent-stock.png') })
    expect(errors).toEqual([])
    console.log(JSON.stringify({ originalID: original.id, copyID, sourceStock: original.stock - 1, copyStock: 0, realInstances: 2, wrongNodeRejected: true, cancelPreserved: true }))
  } finally { await context.close() }
})
