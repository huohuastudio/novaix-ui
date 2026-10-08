import { test, expect } from '@playwright/test'
import fs from 'node:fs'

// 使用显式提供的独立测试环境，不在日常开发数据库中自动创建真实实例。
const fixturePath = process.env.E2E_FREE_ORDER_FIXTURE

test('后台首期免费开通、续费价格和公告链接', async ({ browser }) => {
  test.skip(!fixturePath, '需要配置真实测试节点夹具 E2E_FREE_ORDER_FIXTURE')
  test.setTimeout(240_000)
  const fixture = JSON.parse(fs.readFileSync(fixturePath!, 'utf8'))
  const base = process.env.E2E_BASE_URL || 'http://localhost:8080'
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai' })
  const errors: string[] = []
  try {
    const login = await context.request.post(`${base}/api/v1/login`, { data: { username: fixture.adminUsername || 'admin', password: fixture.adminPassword } })
    const auth = (await login.json()).data
    expect(auth?.token).toBeTruthy()
    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    }, auth)
    const headers = { Authorization: `Bearer ${auth.token}` }
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/admin/orders`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: '新购下单', exact: true }).click()
    const dialog = page.getByRole('dialog')
    for (const [placeholder, option] of [['选择用户', 'system-free-buyer'], ['选择套餐', '系统测试月付套餐'], ['选择节点', '系统测试节点'], ['选择镜像', '系统测试 Debian 12']]) {
      await dialog.getByRole('combobox').filter({ hasText: placeholder }).click()
      await page.getByRole('option').filter({ hasText: option }).click()
    }
    await dialog.getByPlaceholder('实例登录密码').fill(fixture.password)
    await dialog.getByRole('switch', { name: '首期免费' }).check()
    await dialog.getByRole('button', { name: '免费开通', exact: true }).click()
    await expect(dialog.getByText('请填写赠送原因', { exact: true })).toBeVisible()
    await dialog.getByPlaceholder('例如：活动赠送、故障补偿').fill('系统测试赠送')
    await expect(dialog.getByText('首期减免', { exact: true })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('free-order-desktop.png') })
    await page.setViewportSize({ width: 390, height: 844 })
    const bounds = await dialog.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391)
    await dialog.getByPlaceholder('例如：活动赠送、故障补偿').scrollIntoViewIfNeeded()
    await page.screenshot({ path: test.info().outputPath('free-order-mobile.png') })
    await page.setViewportSize({ width: 1440, height: 1000 })
    const response = page.waitForResponse(r => r.url().endsWith('/api/v1/admin/orders') && r.request().method() === 'POST')
    await dialog.getByRole('button', { name: '免费开通', exact: true }).click()
    const result = await (await response).json()
    expect(result.code).toBe(0)
    expect(result.data).toMatchObject({ status: 'paid', amount: 0, discount_amount: 2900, first_period_free: true })
    const orderID = result.data.id
    let detail: { fulfillment_status: string; instance_id: number }
    await expect.poll(async () => {
      const r = await context.request.get(`${base}/api/v1/admin/orders/${orderID}`, { headers })
      detail = (await r.json()).data
      return detail.fulfillment_status
    }, { timeout: 180_000, intervals: [1000, 3000] }).toBe('completed')
    await page.goto(`${base}/admin/orders/${orderID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('首期免费', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '退款', exact: true })).toHaveCount(0)
    await page.screenshot({ path: test.info().outputPath('free-order-completed.png') })
    const users = await context.request.get(`${base}/api/v1/admin/users?keyword=system-free-buyer`, { headers })
    expect((await users.json()).data.items[0].balance).toBe(0)
    console.log(JSON.stringify({ orderID, instanceID: detail!.instance_id, amount: 0, fulfillment: 'completed' }))
    const userLogin = await context.request.post(`${base}/api/v1/login`, { data: { username: 'system-free-buyer', password: fixture.password } })
    const userAuth = (await userLogin.json()).data
    expect(userAuth?.token).toBeTruthy()
    const userHeaders = { Authorization: `Bearer ${userAuth.token}` }
    const renewal = await context.request.post(`${base}/api/v1/portal/instances/${detail!.instance_id}/renew`, { headers: userHeaders, data: { billing_cycle: 'monthly' } })
    const renewalResult = await renewal.json()
    expect(renewalResult.code).toBe(0)
    expect(renewalResult.data.amount).toBe(2900)
    const forbidden = await context.request.post(`${base}/api/v1/admin/orders`, { headers: userHeaders, data: { first_period_free: true } })
    expect(forbidden.status()).toBe(403)
    const portalContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai' })
    try {
      await portalContext.addInitScript(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, userAuth)
      const portalPage = await portalContext.newPage()
      portalPage.on('pageerror', error => errors.push(error.message))
      await portalPage.goto(`${base}/portal/orders/${orderID}`, { waitUntil: 'domcontentloaded' })
      await expect(portalPage.getByText('首期免费', { exact: true })).toBeVisible()
      await portalPage.screenshot({ path: test.info().outputPath('free-order-portal.png') })
    } finally { await portalContext.close() }
    console.log(JSON.stringify({ renewalAmount: renewalResult.data.amount, portalCannotGrant: true }))
    // 公告创建实际提交表单，随后验证新链接和旧链接均能访问。
    await page.goto(`${base}/admin/cms/announcements`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: '发布公告', exact: true }).first().click()
    const announcement = page.getByRole('dialog')
    await announcement.getByPlaceholder('输入公告标题').fill('系统测试中文公告')
    await announcement.locator('[contenteditable="true"]').fill('系统测试公告正文')
    const created = page.waitForResponse(r => r.url().endsWith('/api/v1/admin/articles') && r.request().method() === 'POST')
    await announcement.getByRole('button', { name: /创建|发布|保存/ }).click()
    const article = (await (await created).json()).data
    expect(article.slug).toMatch(/^announcement-[a-f0-9-]{36}$/)
    const update = await context.request.put(`${base}/api/v1/admin/articles/${article.id}`, { headers, data: { title: '系统测试修改标题' } })
    expect((await update.json()).code).toBe(0)
    for (const [slug, title] of [[article.slug, '系统测试修改标题'], [fixture.legacySlug, '原有中文公告']]) {
      await page.goto(`${base}/articles/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    }
    console.log(JSON.stringify({ newSlug: article.slug, legacyLink: 'passed', renamedLink: 'passed' }))
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})
