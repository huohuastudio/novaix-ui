import { test, expect } from '@playwright/test'

test('用户端主题切换按钮可用且能切换到暗色模式', async ({ page }) => {
  await page.goto('/portal')
  const toggle = page.getByRole('button', { name: '切换主题' })
  await expect(toggle).toBeVisible()

  // 循环点击直到 html 出现 dark 类（light → dark → system 三态循环）
  for (let i = 0; i < 3; i++) {
    await toggle.click()
    if (await page.locator('html').evaluate(el => el.classList.contains('dark'))) break
  }
  await expect(page.locator('html')).toHaveClass(/dark/)
})
