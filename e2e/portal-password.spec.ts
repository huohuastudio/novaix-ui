import { test, expect } from '@playwright/test'

// 模拟另一会话开启二次验证或网关返回空响应，防止 HTTP 200 被误当成改密成功。
for (const scenario of [
  { name: '需要二次验证', body: JSON.stringify({ code: 21000, message: '需要二次验证' }), message: '需要二次验证' },
  { name: '空响应', body: '', message: '修改密码失败，请重试' },
]) {
  test(`修改密码遇到${scenario.name}时保留表单并提示失败`, async ({ page }) => {
    await page.route('**/api/v1/portal/profile/password', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: scenario.body,
    }))
    await page.goto('/portal/profile', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('当前密码').fill('system-test-old-password')
    await page.getByLabel('新密码', { exact: true }).fill('system-test-new-password')
    await page.getByRole('button', { name: '修改密码', exact: true }).click()
    await expect(page.getByText(scenario.message, { exact: true })).toBeVisible()
    await expect(page.getByText('密码已修改', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('当前密码')).toHaveValue('system-test-old-password')
    await expect(page.getByLabel('新密码', { exact: true })).toHaveValue('system-test-new-password')
    await expect(page.getByRole('button', { name: '修改密码', exact: true })).toBeEnabled()
  })
}
