import { test, expect } from '@playwright/test'

test('订单管理页展示表格、筛选器和搜索', async ({ page }) => {
  await page.goto('/admin/orders')
  await expect(page.getByRole('heading', { name: '订单管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByPlaceholder('搜索订单号/用户名...')).toBeVisible()
})

test('列表分页与筛选状态同步到 URL，筛选变更重置回第一页', async ({ page }) => {
  // URL 中的分页参数在初次加载时被解析
  await page.goto('/admin/orders?page=2')
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible()

  // 选择类型筛选：URL 应带上 type=new，且分页重置回第一页（page 参数消失）
  await page.getByRole('combobox').filter({ hasText: /^类型$/ }).click()
  await page.getByRole('option', { name: '新购' }).click()
  await expect(page).toHaveURL(/type=new/)
  await expect(page).not.toHaveURL(/page=2/)
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible()

  // 点击重置：筛选清空，URL 恢复干净
  await page.getByRole('button', { name: '重置' }).click()
  await expect(page).not.toHaveURL(/type=new/)
})

test('URL 中的筛选参数在初次加载时回填筛选器', async ({ page }) => {
  await page.goto('/admin/orders?status=pending')
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('combobox').filter({ hasText: '待支付' })).toBeVisible()
})
