import { test, expect } from '@playwright/test'

test.describe('CMS 公共页面', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('首页展示 CMS 导航菜单', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('开始使用')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('nav').getByText('产品')).toBeVisible()
    await expect(page.locator('nav').getByText('数据中心')).toBeVisible()
  })

  test('首页展示 CMS FAQ section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('常见问题')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('支持哪些付款方式？')).toBeVisible()
  })

  test('首页展示客户评价 section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('客户评价')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('张伟')).toBeVisible()
  })

  test('首页展示数据中心 section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('全球数据中心')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('香港 CN2')).toBeVisible()
  })

  test('页脚展示 CMS 导航链接', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer.getByText('帮助中心')).toBeVisible({ timeout: 10_000 })
    await expect(footer.getByText('常见问题')).toBeVisible()
    await expect(footer.getByText('关于我们')).toBeVisible()
  })

  test('文章列表加载并展示文章', async ({ page }) => {
    await page.goto('/articles')
    await expect(page.getByRole('heading', { name: '文章' })).toBeVisible()
    await expect(page.getByText('最新资讯、公告和活动')).toBeVisible()
  })

  test('文章列表支持类型筛选', async ({ page }) => {
    await page.goto('/articles?type=announcement')
    await expect(page.getByRole('heading', { name: '文章' })).toBeVisible()
    const announcementBtn = page.locator('button', { hasText: '公告' })
    await expect(announcementBtn).toBeVisible()
  })

  test('文章详情页加载', async ({ page }) => {
    await page.goto('/articles/novaix-launch?type=announcement')
    await expect(page.getByText('Novaix 平台正式上线')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('返回文章列表')).toBeVisible()
  })

  test('帮助中心展示分类', async ({ page }) => {
    await page.goto('/help')
    await expect(page.getByRole('heading', { name: '帮助中心' })).toBeVisible()
    await expect(page.getByText('搜索文档或浏览分类')).toBeVisible()
  })

  test('帮助文章详情页加载', async ({ page }) => {
    await page.goto('/help/create-first-server')
    await expect(page.getByText('如何创建第一台云服务器')).toBeVisible({ timeout: 10_000 })
  })

  test('FAQ 页面展示问题分组', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.getByRole('heading', { name: '常见问题' })).toBeVisible()
    await expect(page.getByText('计费相关')).toBeVisible()
    await expect(page.getByText('产品功能')).toBeVisible()
  })

  test('FAQ 手风琴展开收起', async ({ page }) => {
    await page.goto('/faq')
    const question = page.getByText('支持哪些付款方式？')
    await expect(question).toBeVisible({ timeout: 10_000 })
    await question.click()
    await expect(page.getByText('目前支持支付宝和微信支付')).toBeVisible()
  })

  test('更新日志页面展示版本', async ({ page }) => {
    await page.goto('/changelog')
    await expect(page.getByRole('heading', { name: '更新日志' })).toBeVisible()
    await expect(page.getByText('0.2.5')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('0.2.4')).toBeVisible()
  })

  test('数据中心页面展示节点', async ({ page }) => {
    await page.goto('/data-centers')
    await expect(page.getByRole('heading', { name: '数据中心' })).toBeVisible()
    await expect(page.getByText('香港 CN2')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('东京 BGP')).toBeVisible()
    await expect(page.getByText('洛杉矶 GIA')).toBeVisible()
  })

  test('团队成员页面展示信息', async ({ page }) => {
    await page.goto('/team')
    await expect(page.getByRole('heading', { name: '我们的团队' })).toBeVisible()
    await expect(page.getByText('陈明')).toBeVisible({ timeout: 10_000 })
  })

  test('品牌素材页面展示下载', async ({ page }) => {
    await page.goto('/brand-assets')
    await expect(page.getByRole('heading', { name: '品牌素材' })).toBeVisible()
    await expect(page.getByText('Logo 横版 (PNG)')).toBeVisible({ timeout: 10_000 })
  })

  test('CMS 单页面加载', async ({ page }) => {
    await page.goto('/pages/about-us')
    await expect(page.getByText('关于 Novaix')).toBeVisible({ timeout: 10_000 })
  })

  test('不存在的文章显示 404', async ({ page }) => {
    await page.goto('/articles/non-existent-slug-12345')
    await expect(page.getByText('文章未找到')).toBeVisible({ timeout: 10_000 })
  })

  test('不存在的页面显示 404', async ({ page }) => {
    await page.goto('/pages/non-existent-page-12345')
    await expect(page.getByText('页面未找到')).toBeVisible({ timeout: 10_000 })
  })
})
