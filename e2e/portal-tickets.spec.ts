import { test, expect } from '@playwright/test'
import { fillRichEditor } from './helpers'

test.describe('用户端工单', () => {
  test('提交工单并查看详情', async ({ page }) => {
    const subject = `E2E 测试工单 ${Date.now()}`

    await page.goto('/portal/tickets')
    await expect(page.getByRole('heading', { name: '工单' })).toBeVisible()

    await page.getByRole('button', { name: '提交工单' }).click()
    await expect(page.getByRole('heading', { name: '提交工单' })).toBeVisible()
    await page.getByLabel('主题').fill(subject)
    await fillRichEditor(page, '这是一条 E2E 测试工单内容，请忽略。')
    await page.getByRole('button', { name: '提交' }).click()
    await expect(page.getByText(subject)).toBeVisible({ timeout: 10_000 })

    await page.getByText(subject).click()
    await expect(page).toHaveURL(/\/portal\/tickets\/\d+/)
    await expect(page.getByText(subject)).toBeVisible()
  })

  test('工单状态筛选器可用', async ({ page }) => {
    await page.goto('/portal/tickets')
    await page.getByRole('combobox').click()
    await expect(page.getByText('全部状态')).toBeVisible()
    await expect(page.getByText('待回复')).toBeVisible()
    await expect(page.getByText('已回复')).toBeVisible()
    await expect(page.getByText('已关闭')).toBeVisible()
  })
})
