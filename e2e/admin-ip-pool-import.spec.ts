import { test, expect, type Page } from '@playwright/test'
import { parsePoolNetwork } from '../src/lib/ip-pool'

// 使用独立会话和模拟节点数据，避免操作真实节点网络。
test.use({ storageState: { cookies: [], origins: [] }, headless: true, timezoneId: 'Asia/Shanghai' })

test('网段计算覆盖压缩 IPv6、非整段前缀及边界', () => {
  for (const [address, cidr] of [
    ['2001:db8::1/64', '2001:db8::/64'],
    ['2001:db8:1:2:3:4:5:6/64', '2001:db8:1:2::/64'],
    ['2001:db8:1:2:ffff::1/65', '2001:db8:1:2:8000::/65'],
    ['2001:db8::1/0', '::/0'],
    ['2001:db8::1/128', '2001:db8::1/128'],
    ['2001:db8::/64', '2001:db8::/64'],
  ]) {
    expect(parsePoolNetwork(address, 'ipv6')?.cidr).toBe(cidr)
  }
  for (const [address, cidr] of [
    ['192.0.2.129/25', '192.0.2.128/25'],
    ['192.0.2.1/0', '0.0.0.0/0'],
    ['192.0.2.1/32', '192.0.2.1/32'],
  ]) {
    expect(parsePoolNetwork(address, 'ipv4')?.cidr).toBe(cidr)
  }
  for (const address of ['none', 'auto', '', '2001:db8::1', '2001:db8:::/64', '2001:db8::1/129', 'fe80::1%eth0/64', '192.0.2.1/24']) {
    expect(parsePoolNetwork(address, 'ipv6')).toBeNull()
  }
  expect(parsePoolNetwork('2001:db8::1/64', 'ipv4')).toBeNull()
})

async function openPoolForm(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'system-test')
    localStorage.setItem('user', JSON.stringify({ id: 1, username: '系统测试', role: 'admin' }))
  })
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/proxy/1.0/networks')) {
      await route.fulfill({ json: { type: 'sync', metadata: [
        { name: 'br0', managed: true, config: { 'ipv4.address': '192.0.2.129/25', 'ipv6.address': '2001:db8::1/64' } },
        { name: 'br1', managed: true, config: { 'ipv6.address': 'none' } },
      ] } })
      return
    }
    const data = path.endsWith('/nodes')
      ? { items: [{ id: 1, name: '系统测试节点', status: 1 }], total: 1 }
      : path.endsWith('/tasks/active') ? [] : { items: [], total: 0 }
    await route.fulfill({ json: { code: 0, message: 'ok', data } })
  })
  await page.goto('/admin/ips', { waitUntil: 'domcontentloaded' })
  await page.getByRole('cell').getByRole('button', { name: '创建 IP 池' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/^名称/).fill('系统测试池')
  await dialog.getByRole('combobox').filter({ hasText: '选择节点' }).click()
  await page.getByRole('option', { name: '系统测试节点' }).click()
  return dialog
}

test('导入 IPv6 后提交正确网段和网关', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const dialog = await openPoolForm(page)
  await dialog.getByLabel(/^类型/).click()
  await page.getByRole('option', { name: 'IPv6', exact: true }).click()
  await dialog.getByRole('combobox').filter({ hasText: '选择网桥' }).click()
  await page.getByRole('option', { name: 'br0', exact: false }).click()
  await expect(dialog.getByLabel(/^CIDR/)).toHaveValue('2001:db8::/64')
  await expect(dialog.getByLabel(/^网关/)).toHaveValue('2001:db8::1')
  await page.screenshot({ path: testInfo.outputPath('ipv6-import.png'), fullPage: true })
  const request = page.waitForRequest(req => req.url().endsWith('/admin/ip-pools') && req.method() === 'POST')
  await dialog.getByRole('button', { name: '创建', exact: true }).click()
  expect((await request).postDataJSON()).toMatchObject({ type: 'ipv6', cidr: '2001:db8::/64', gateway: '2001:db8::1', node_id: 1, network_name: 'br0' })
  await expect(dialog).not.toBeVisible()
  expect(errors).toEqual([])
})

test('导入后切换类型重新计算网段，无有效配置时清空旧地址', async ({ page }) => {
  const dialog = await openPoolForm(page)
  await dialog.getByRole('combobox').filter({ hasText: '选择网桥' }).click()
  await page.getByRole('option', { name: 'br0', exact: false }).click()
  await expect(dialog.getByLabel(/^CIDR/)).toHaveValue('192.0.2.128/25')
  await dialog.getByLabel(/^类型/).click()
  await page.getByRole('option', { name: 'IPv6', exact: true }).click()
  await expect(dialog.getByLabel(/^CIDR/)).toHaveValue('2001:db8::/64')
  await dialog.getByRole('combobox').filter({ hasText: 'br0' }).click()
  await page.getByRole('option', { name: 'br1', exact: true }).click()
  await expect(dialog.getByLabel(/^CIDR/)).toHaveValue('')
  await expect(dialog.getByLabel(/^网关/)).toHaveValue('')
  await expect(page.getByText('该网桥没有有效的 IPv6 地址配置，请手动填写或选择其他网桥')).toBeVisible()
})

test('手工填写非法 CIDR 时显示字段提示且不提交', async ({ page }) => {
  let submitted = false
  page.on('request', req => { if (req.method() === 'POST' && req.url().endsWith('/admin/ip-pools')) submitted = true })
  const dialog = await openPoolForm(page)
  await dialog.getByLabel(/^CIDR/).fill('2001:db8:::/64')
  await dialog.getByLabel(/^网关/).fill('2001:db8::1')
  await dialog.getByRole('button', { name: '创建', exact: true }).click()
  await expect(dialog.getByText('CIDR 格式不正确，请填写 IP 地址和前缀长度')).toBeVisible()
  expect(submitted).toBe(false)
})
