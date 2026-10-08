import { test, expect } from '@playwright/test'
import fs from 'node:fs'

// 仅对独立夹具启用，夹具需包含两个套餐和可开通的真实测试节点。
const fixturePath = process.env.E2E_COUPON_SCOPE_FIXTURE
test.use({ storageState: { cookies: [], origins: [] }, headless: true, actionTimeout: 15_000 })

test('优惠券指定套餐覆盖表单、新购、持续续费和付款复核', async ({ browser }) => {
  test.skip(!fixturePath, '需要配置 E2E_COUPON_SCOPE_FIXTURE')
  test.setTimeout(300_000)
  const f = JSON.parse(fs.readFileSync(fixturePath!, 'utf8'))
  const base = process.env.E2E_BASE_URL || 'http://localhost:8080'
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai' })
  const buyer = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai' })
  const code = `SCOPE${Date.now()}`
  try {
    const auth = (await (await context.request.post(`${base}/api/v1/login`, { data: { username: 'admin', password: f.adminPassword } })).json()).data
    const userAuth = (await (await buyer.request.post(`${base}/api/v1/login`, { data: { username: 'system-coupon-buyer', password: f.password } })).json()).data
    expect(auth?.token).toBeTruthy()
    expect(userAuth?.token).toBeTruthy()
    const adminHeaders = { Authorization: `Bearer ${auth.token}` }
    const userHeaders = { Authorization: `Bearer ${userAuth.token}` }
    for (const [ctx, credentials] of [[context, auth], [buyer, userAuth]] as const) {
      await ctx.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      }, credentials)
    }
    const page = await context.newPage()
    const userPage = await buyer.newPage()
    const errors: string[] = []
    for (const p of [page, userPage]) {
      p.on('pageerror', e => errors.push(e.message))
      p.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) errors.push(r.failure()?.errorText || r.url()) })
    }
    await page.goto(`${base}/admin/coupons`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: '创建优惠券', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('例如 WELCOME50').fill(code)
    await dialog.getByLabel(/面值/).fill('100')
    await dialog.getByLabel('适用套餐', { exact: true }).click()
    await page.getByRole('option', { name: '指定套餐', exact: true }).click()
    await dialog.getByRole('button', { name: '创建', exact: true }).click()
    await expect(dialog.getByText('请至少选择一个套餐', { exact: true })).toBeVisible()
    await dialog.getByRole('combobox').filter({ hasText: '选择适用套餐' }).click()
    const planA = `系统测试优惠券套餐 A (#${f.planID})`
    const planB = `系统测试优惠券套餐 B (#${f.planBID})`
    await page.getByRole('option', { name: planA, exact: true }).click()
    await page.getByRole('option', { name: planB, exact: true }).click()
    await page.keyboard.press('Escape')
    await dialog.getByLabel('折扣模式', { exact: true }).click()
    await page.getByRole('option', { name: '持续', exact: true }).click()
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('coupon-scope-desktop.png') })
    await page.setViewportSize({ width: 390, height: 844 })
    const bounds = await dialog.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391)
    await dialog.getByLabel('折扣模式', { exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('coupon-scope-mobile.png') })
    const creating = page.waitForResponse(r => r.url().endsWith('/api/v1/admin/coupons') && r.request().method() === 'POST')
    await dialog.getByRole('button', { name: '创建', exact: true }).click()
    const created = await (await creating).json()
    expect(created.code).toBe(0)
    const couponID = created.data.id
    expect(created.data.plan_ids).toBe([f.planID, f.planBID].sort((a,b) => a-b).join(','))
    await expect(dialog).toHaveCount(0)
    await page.setViewportSize({ width: 1440, height: 1000 })
    const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: code, exact: true }) })
    await expect(row).toContainText('指定 2 个套餐')
    await row.locator('button:has(svg.lucide-pencil)').click()
    await expect(dialog.getByRole('combobox').filter({ hasText: planA })).toContainText(planB)
    await dialog.getByRole('combobox').filter({ hasText: planA }).click()
    await page.getByRole('option', { name: planB, exact: true }).click()
    await page.keyboard.press('Escape')
    const saving = page.waitForResponse(r => r.url().endsWith(`/api/v1/admin/coupons/${couponID}`) && r.request().method() === 'PUT')
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    expect((await (await saving).json()).data.plan_ids).toBe(String(f.planID))
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: code, exact: true }).click()
    await expect(page.getByText(planA, { exact: true })).toBeVisible()
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('coupon-scope-detail.png') })
    await userPage.goto(`${base}/portal/purchase`, { waitUntil: 'domcontentloaded' })
    await userPage.getByRole('button').filter({ has: userPage.getByText('系统测试优惠券套餐 B', { exact: true }) }).click()
    // 默认计费周期可能是时付，固定为月付验证折扣。
    await userPage.getByRole('button', { name: /^月付/ }).click()
    await userPage.getByPlaceholder('输入优惠码').fill(code)
    let validating = userPage.waitForResponse(r => r.url().endsWith('/portal/coupons/validate'))
    await userPage.getByRole('button', { name: '使用', exact: true }).click()
    expect((await (await validating).json()).code).toBe(21211)
    await expect(userPage.getByText('该优惠券不适用于当前套餐').first()).toBeVisible()
    await userPage.getByRole('button').filter({ has: userPage.getByText('系统测试优惠券套餐 A', { exact: true }) }).click()
    await userPage.getByRole('button', { name: /^月付/ }).click()
    validating = userPage.waitForResponse(r => r.url().endsWith('/portal/coupons/validate'))
    await userPage.getByRole('button', { name: '使用', exact: true }).click()
    expect((await (await validating).json()).data.discount_amount).toBe(100)
    await expect(userPage.getByText(/已优惠/)).toBeVisible()
    await userPage.screenshot({ animations: 'disabled', path: test.info().outputPath('coupon-scope-purchase.png') })
    const purchasePlans = (await (await buyer.request.get(`${base}/api/v1/portal/plans`, { headers: userHeaders })).json()).data.plans
    const regionID = purchasePlans.find((p: { id: number }) => p.id === f.planID).regions[0].id
    const createOrder = async (planID: number) => (await (await buyer.request.post(`${base}/api/v1/portal/orders`, { headers: userHeaders, data: { plan_id: planID, region_id: regionID, image_id: f.imageID, billing_cycle: 'monthly', hostname: 'system-scope-test', password: f.password, coupon_code: code, quantity: 1 } })).json())
    expect((await createOrder(f.planBID)).code).toBe(21211)
    const order = await createOrder(f.planID)
    expect(order.code).toBe(0)
    expect(order.data.amount).toBe(2800)
    const pay = async (id: number) => (await (await buyer.request.post(`${base}/api/v1/portal/orders/${id}/pay`, { headers: userHeaders })).json())
    expect((await pay(order.data.id)).code).toBe(0)
    const getOrder = async (id: number) => (await (await context.request.get(`${base}/api/v1/admin/orders/${id}`, { headers: adminHeaders })).json()).data
    await expect.poll(async () => (await getOrder(order.data.id)).fulfillment_status, { timeout: 180_000, intervals: [2000] }).toBe('completed')
    const instanceID = (await getOrder(order.data.id)).instance_id
    expect(instanceID).toBeTruthy()
    const instance = (await (await buyer.request.get(`${base}/api/v1/portal/instances/${instanceID}`, { headers: userHeaders })).json()).data
    expect(instance.plan_id).toBe(f.planID)
    const renew = (await (await buyer.request.post(`${base}/api/v1/portal/instances/${instanceID}/renew`, { headers: userHeaders, data: { billing_cycle: 'monthly' } })).json())
    expect(renew.code).toBe(0)
    expect(renew.data.amount).toBe(2800)
    const updated = await context.request.put(`${base}/api/v1/admin/coupons/${couponID}`, { headers: adminHeaders, data: { plan_ids: String(f.planBID) } })
    expect((await updated.json()).code).toBe(0)
    const changed = await pay(renew.data.id)
    expect(changed.code).not.toBe(0)
    expect(changed.message).toContain('金额')
    expect((await getOrder(renew.data.id)).amount).toBe(2900)
    expect((await pay(renew.data.id)).code).toBe(0)
    // 编辑改回全部套餐必须显式保存空范围。
    await page.goto(`${base}/admin/coupons`, { waitUntil: 'domcontentloaded' })
    await row.locator('button:has(svg.lucide-pencil)').click()
    await dialog.getByLabel('适用套餐', { exact: true }).click()
    await page.getByRole('option', { name: '全部套餐', exact: true }).click()
    const clearing = page.waitForResponse(r => r.url().endsWith(`/api/v1/admin/coupons/${couponID}`) && r.request().method() === 'PUT')
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    expect((await (await clearing).json()).data.plan_ids).toBe('')
    await expect(row).toContainText('全部套餐')
    expect(errors).toEqual([])
    fs.writeFileSync(test.info().outputPath('result.json'), JSON.stringify({ couponID, orderID: order.data.id, instanceID, renewID: renew.data.id, purchaseAmount: 2800, recurringAmountBeforeChange: 2800, renewAmountAfterChange: 2900 }))
  } finally {
    await buyer.close()
    await context.close()
  }
})

test('套餐复制表单的节点和镜像多选保持可用', async ({ browser }) => {
  test.skip(!fixturePath, '需要配置 E2E_COUPON_SCOPE_FIXTURE')
  const f = JSON.parse(fs.readFileSync(fixturePath!, 'utf8'))
  const base = process.env.E2E_BASE_URL || 'http://localhost:8080'
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai' })
  try {
    const auth = (await (await context.request.post(`${base}/api/v1/login`, { data: { username: 'admin', password: f.adminPassword } })).json()).data
    await context.addInitScript(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, auth)
    const page = await context.newPage()
    await page.goto(`${base}/admin/plans`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('row').filter({ has: page.getByText('系统测试优惠券套餐 A', { exact: true }) }).getByRole('button', { name: '更多操作' }).click()
    await page.getByRole('menuitem', { name: '复制套餐', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const nodes = dialog.getByRole('combobox').filter({ hasText: '系统测试节点' })
    await nodes.click()
    const node = page.getByRole('option').filter({ hasText: '系统测试节点' })
    await expect(node).toHaveAttribute('data-checked', 'true')
    await node.click()
    await expect(node).toHaveAttribute('data-checked', 'false')
    await node.click()
    await expect(node).toHaveAttribute('data-checked', 'true')
    await page.keyboard.press('Escape')
    await expect(dialog.getByRole('combobox').filter({ hasText: '系统测试 Debian 12' })).toBeVisible()
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('plan-copy-multiselect-mobile.png') })
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await expect(dialog).toHaveCount(0)
  } finally { await context.close() }
})

test('修改指定套餐后手动优惠订单付款失败且余额和库存不变', async ({ request }) => {
  test.skip(!fixturePath, '需要配置 E2E_COUPON_SCOPE_FIXTURE')
  const f = JSON.parse(fs.readFileSync(fixturePath!, 'utf8'))
  const base = process.env.E2E_BASE_URL || 'http://localhost:8080'
  const admin = (await (await request.post(`${base}/api/v1/login`, { data: { username: 'admin', password: f.adminPassword } })).json()).data
  const buyer = (await (await request.post(`${base}/api/v1/login`, { data: { username: 'system-coupon-buyer', password: f.password } })).json()).data
  const adminHeaders = { Authorization: `Bearer ${admin.token}` }
  const buyerHeaders = { Authorization: `Bearer ${buyer.token}` }
  const readAdmin = async (path: string) => (await (await request.get(`${base}/api/v1/admin/${path}`, { headers: adminHeaders })).json()).data
  const code = `SCOPEPAY${Date.now()}`
  const coupon = (await (await request.post(`${base}/api/v1/admin/coupons`, { headers: adminHeaders, data: { code, type: 'fixed', value: 100, enabled: true, plan_ids: String(f.planID) } })).json()).data
  const plans = (await (await request.get(`${base}/api/v1/portal/plans`, { headers: buyerHeaders })).json()).data.plans
  const regionID = plans.find((p: { id: number }) => p.id === f.planID).regions[0].id
  const order = (await (await request.post(`${base}/api/v1/portal/orders`, { headers: buyerHeaders, data: { plan_id: f.planID, region_id: regionID, image_id: f.imageID, billing_cycle: 'monthly', hostname: 'system-scope-pay', password: f.password, coupon_code: code, quantity: 1 } })).json()).data
  expect(order.amount).toBe(2800)
  const beforeUser = await readAdmin(`users/${f.userID}`)
  const beforePlan = await readAdmin(`plans/${f.planID}`)
  expect((await (await request.put(`${base}/api/v1/admin/coupons/${coupon.id}`, { headers: adminHeaders, data: { plan_ids: String(f.planBID) } })).json()).code).toBe(0)
  const paid = (await (await request.post(`${base}/api/v1/portal/orders/${order.id}/pay`, { headers: buyerHeaders })).json())
  expect(paid.code).toBe(21211)
  expect((await readAdmin(`users/${f.userID}`)).balance).toBe(beforeUser.balance)
  expect((await readAdmin(`plans/${f.planID}`)).stock).toBe(beforePlan.stock)
  expect((await readAdmin(`coupons/${coupon.id}`)).used_count).toBe(0)
  expect((await readAdmin(`orders/${order.id}`)).status).toBe('pending')
  expect((await (await request.post(`${base}/api/v1/portal/orders/${order.id}/cancel`, { headers: buyerHeaders })).json()).code).toBe(0)
})
