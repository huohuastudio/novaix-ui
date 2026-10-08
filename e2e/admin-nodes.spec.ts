import { test, expect } from '@playwright/test'

test('节点管理页展示表格、添加按钮并可打开表单', async ({ page }) => {
  await page.goto('/admin/nodes')
  await expect(page.getByRole('heading', { name: '节点管理' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('button', { name: '添加节点' }).click()
  await expect(page.getByRole('heading', { name: /添加节点|创建节点/ })).toBeVisible()
})

test('停用节点保留实例处理入口，普通节点显示流量排行入口', async ({ page }) => {
  await page.route(/\/api\/v1\/admin\/nodes(?:\?.*)?$/, route => route.fulfill({
    json: {
      code: 0,
      data: {
        items: [
          { id: 90001, name: '系统测试在线节点', status: 1, instance_count: 3 },
          { id: 90002, name: '系统测试停用节点', status: 6, instance_count: 2 },
        ],
        total: 2, page: 1, page_size: 20,
      },
    },
  }))
  await page.goto('/admin/nodes', { waitUntil: 'domcontentloaded' })
  const active = page.getByRole('row').filter({ hasText: '系统测试在线节点' })
  const retired = page.getByRole('row').filter({ hasText: '系统测试停用节点' })
  await expect(active.getByRole('link', { name: '查看排行' })).toHaveAttribute('href', '/admin/nodes/90001/instances?sort=traffic_used&order=desc')
  await expect(retired.getByRole('link', { name: '查看排行' })).toHaveCount(0)
  await expect(retired.getByRole('link', { name: '2 台' })).toHaveAttribute('href', '/admin/nodes/90002/instances')
})
