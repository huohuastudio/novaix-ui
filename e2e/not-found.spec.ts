import { test, expect } from '@playwright/test'

test.describe('404 页面', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('访问不存在的路由展示 404 页面', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('你访问的页面不存在或已被移除')).toBeVisible()
  })

  test('404 页面有返回首页按钮', async ({ page }) => {
    await page.goto('/random-nonexistent-page')
    await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible()
  })

  test('点击返回首页按钮跳转到首页', async ({ page }) => {
    await page.goto('/random-nonexistent-page')
    await page.getByRole('link', { name: '返回首页' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
