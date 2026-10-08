import { randomUUID } from 'node:crypto'
import { test, expect, type Page } from '@playwright/test'
import { getTokenFromPage } from './helpers'

test.describe('公告链接别名', () => {
  const createdIDs: number[] = []
  let headers: Record<string, string>
  let browserErrors: string[]

  test.beforeEach(async ({ page }) => {
    browserErrors = []
    page.on('pageerror', error => browserErrors.push(error.message))
    page.on('response', response => {
      if (response.status() >= 500) browserErrors.push(`${response.status()} ${response.url()}`)
    })
    await page.goto('/admin/cms/announcements')
    await expect(page.getByRole('button', { name: '发布公告', exact: true }).first()).toBeVisible()
    headers = { Authorization: `Bearer ${await getTokenFromPage(page)}` }
  })

  test.afterEach(async ({ request }) => {
    // 只清理当前用例创建的数据。
    for (const id of createdIDs.splice(0)) {
      const response = await request.delete(`/api/v1/admin/articles/${id}`, { headers })
      expect((await response.json()).code).toBe(0)
    }
    expect(browserErrors).toEqual([])
  })

  async function submit(page: Page, method: 'POST' | 'PUT', button: string) {
    const response = page.waitForResponse(r => r.url().includes('/api/v1/admin/articles') && r.request().method() === method)
    await page.getByRole('dialog').getByRole('button', { name: button, exact: true }).click()
    const body = await (await response).json()
    if (method === 'POST' && body.code === 0) createdIDs.push(body.data.id)
    return body
  }

  async function openCreate(page: Page, title: string) {
    await page.getByRole('button', { name: '发布公告', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel(/^标题/).fill(title)
    await dialog.locator('.ProseMirror').fill('系统测试：公告链接验证。')
    return dialog
  }

  test('默认标识稳定且可以访问详情', async ({ page }) => {
    const title = `系统测试默认公告-${randomUUID()}`
    const dialog = await openCreate(page, title)
    const slugField = dialog.getByLabel(/^别名 \(Slug\)/)
    const slug = await slugField.inputValue()
    expect(slug).toMatch(/^announcement-[0-9a-f-]{36}$/)
    await dialog.getByLabel(/^标题/).fill(`${title}修改`)
    await expect(slugField).toHaveValue(slug)
    expect((await submit(page, 'POST', '发布')).data.slug).toBe(slug)
    await expect(dialog).toHaveCount(0)
    await page.goto(`/articles/${slug}?type=announcement`)
    await expect(page.getByRole('heading', { name: `${title}修改`, exact: true })).toBeVisible()
  })

  test('自定义别名支持校验和重复后重试', async ({ page, request }) => {
    // 公告与普通文章共用别名空间。
    const existingSlug = `system-test-${randomUUID()}`
    const response = await request.post('/api/v1/admin/articles', { headers, data: {
      title: '系统测试已有文章', slug: existingSlug, type: 'news', content: '<p>系统测试</p>', status: 1,
    } })
    const existing = await response.json()
    expect(existing.code).toBe(0)
    createdIDs.push(existing.data.id)
    const title = `系统测试自定义公告-${randomUUID()}`
    const dialog = await openCreate(page, title)
    const slugField = dialog.getByLabel(/^别名 \(Slug\)/)
    await slugField.fill('   ')
    await dialog.getByRole('button', { name: '发布', exact: true }).click()
    await expect(dialog.getByText('别名不能为空')).toBeVisible()
    await slugField.fill('a'.repeat(256))
    await dialog.getByRole('button', { name: '发布', exact: true }).click()
    await expect(dialog.getByText('别名不能超过 255 个字符')).toBeVisible()
    await slugField.fill(existingSlug)
    expect((await submit(page, 'POST', '发布')).code).not.toBe(0)
    await expect(slugField).toHaveValue(existingSlug)
    await expect(page.getByText(/别名已存在/).first()).toBeVisible()
    const customSlug = `notice-${randomUUID()}`
    await slugField.fill(customSlug)
    expect((await submit(page, 'POST', '发布')).data.slug).toBe(customSlug)
    await expect(dialog).toHaveCount(0)
    await page.goto(`/articles/${customSlug}?type=announcement`)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  })

  test('旧中文别名回填，标题修改保留链接，主动改名后新链接生效', async ({ page, request }, testInfo) => {
    const title = `系统测试旧公告-${randomUUID()}`
    const oldSlug = `旧公告-${randomUUID()}`
    const response = await request.post('/api/v1/admin/articles', { headers, data: {
      title, slug: oldSlug, type: 'announcement', content: '<p>系统测试旧公告</p>', status: 1,
    } })
    const existing = await response.json()
    expect(existing.code).toBe(0)
    createdIDs.push(existing.data.id)
    await page.reload()
    const row = page.getByRole('row').filter({ hasText: title })
    await row.getByRole('button').first().click()
    const dialog = page.getByRole('dialog')
    const slugField = dialog.getByLabel(/^别名 \(Slug\)/)
    await expect(slugField).toHaveValue(oldSlug)
    await dialog.getByLabel(/^标题/).fill(`${title}修改`)
    expect((await submit(page, 'PUT', '保存')).data.slug).toBe(oldSlug)
    await expect(dialog).toHaveCount(0)
    await page.goto(`/articles/${encodeURIComponent(oldSlug)}?type=announcement`)
    await expect(page.getByRole('heading', { name: `${title}修改`, exact: true })).toBeVisible()
    await page.goto('/admin/cms/announcements')
    await page.getByRole('row').filter({ hasText: `${title}修改` }).getByRole('button').first().click()
    const newSlug = `notice-${randomUUID()}`
    await slugField.fill(newSlug)
    await expect(dialog.getByText('修改别名后，原公告链接将失效，请同步更新已分享的链接。')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('edit-desktop.png') })
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(slugField).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('edit-mobile.png') })
    expect((await submit(page, 'PUT', '保存')).data.slug).toBe(newSlug)
    await expect(dialog).toHaveCount(0)
    await page.goto(`/articles/${newSlug}?type=announcement`)
    await expect(page.getByRole('heading', { name: `${title}修改`, exact: true })).toBeVisible()
    await page.goto(`/articles/${encodeURIComponent(oldSlug)}?type=announcement`)
    await expect(page.getByText('文章未找到')).toBeVisible()
  })
})
