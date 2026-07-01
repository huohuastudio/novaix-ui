import { test, expect } from '@playwright/test'
import { fillRichEditor } from './helpers'

test.describe('公告管理', () => {
  test('创建、编辑、删除公告完整流程', async ({ page }) => {
    const title = `E2E 测试公告 ${Date.now()}`

    await page.goto('/admin/cms/announcements')
    await expect(page.getByRole('heading', { name: '公告管理' })).toBeVisible()

    // 创建公告
    await page.getByRole('button', { name: '发布公告' }).click()
    await expect(page.getByText('发布公告')).toBeVisible()
    await page.getByLabel('标题').fill(title)
    await fillRichEditor(page, '这是一条 E2E 测试公告内容')
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

    // 编辑公告
    const row = page.locator('tr', { hasText: title })
    await row.getByRole('button').first().click()
    await expect(page.getByText('编辑公告')).toBeVisible()
    await page.getByLabel('标题').fill(`${title} (已编辑)`)
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText(`${title} (已编辑)`)).toBeVisible({ timeout: 10_000 })

    // 删除公告
    const editedTitle = `${title} (已编辑)`
    const editedRow = page.locator('tr', { hasText: editedTitle })
    await editedRow.getByRole('button').nth(1).click()
    await expect(page.getByText('删除公告')).toBeVisible()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByText(editedTitle)).not.toBeVisible({ timeout: 10_000 })
  })
})
