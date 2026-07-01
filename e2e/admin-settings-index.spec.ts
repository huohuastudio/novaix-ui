import { test, expect } from '@playwright/test'

test.describe('系统设置首页', () => {
  test('设置首页展示所有分类', async ({ page }) => {
    await page.goto('/admin/settings')
    await expect(page.getByText('站点名称')).toBeVisible()
    await expect(page.getByText('基础设置')).toBeVisible()
    await expect(page.getByText('通知与消息')).toBeVisible()
    await expect(page.getByText('财务与支付')).toBeVisible()
    await expect(page.getByText('安全与用户')).toBeVisible()
    await expect(page.getByText('实例与运维')).toBeVisible()
  })

  test('点击设置项可以进入详情', async ({ page }) => {
    await page.goto('/admin/settings')
    await page.getByText('站点信息').click()
    await expect(page).toHaveURL(/\/admin\/settings\/site/)
  })

  test('设置详情页有返回面包屑', async ({ page }) => {
    await page.goto('/admin/settings/site')
    await expect(page.getByText('系统设置')).toBeVisible()
  })
})
