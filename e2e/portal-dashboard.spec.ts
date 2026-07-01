import { test, expect } from '@playwright/test'

test('用户端仪表盘展示欢迎语、统计卡片和内容区域', async ({ page }) => {
  await page.goto('/portal')
  await expect(page.getByText(/你好/)).toBeVisible()
  await expect(page.getByText('云服务器')).toBeVisible()
  await expect(page.getByText('待处理订单')).toBeVisible()
  await expect(page.getByText('工单')).toBeVisible()
  await expect(page.getByText('账户余额')).toBeVisible()
  await expect(page.getByText('产品与服务')).toBeVisible()
  await expect(page.getByText('最新公告')).toBeVisible()
})
