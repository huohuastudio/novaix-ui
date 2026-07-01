import { test, expect } from '@playwright/test'

test.describe('管理后台资源页面交互', () => {
  test('镜像管理 - 展示添加按钮和分组管理', async ({ page }) => {
    await page.goto('/admin/images')
    await expect(page.getByRole('heading', { name: '镜像管理' })).toBeVisible()
    await expect(page.getByRole('button', { name: '添加镜像' })).toBeVisible()
    await expect(page.getByRole('button', { name: '分组管理' })).toBeVisible()
  })

  test('IP 池管理 - 点击创建打开对话框', async ({ page }) => {
    await page.goto('/admin/ips')
    await expect(page.getByRole('heading', { name: 'IP 池管理' })).toBeVisible()
    await page.getByRole('button', { name: '创建 IP 池' }).click()
    await expect(page.getByText('创建 IP 池')).toBeVisible()
  })

  test('共享 IP 管理 - 展示创建按钮', async ({ page }) => {
    await page.goto('/admin/shared-ips')
    await expect(page.getByRole('heading', { name: '共享 IP 管理' })).toBeVisible()
    await expect(page.getByRole('button', { name: '创建共享 IP' })).toBeVisible()
  })

  test('流量包管理 - 展示添加按钮', async ({ page }) => {
    await page.goto('/admin/traffic-packages')
    await expect(page.getByRole('heading', { name: '流量包管理' })).toBeVisible()
    await expect(page.getByRole('button', { name: '添加流量包' })).toBeVisible()
  })

  test('ISO 镜像 - 点击创建打开对话框', async ({ page }) => {
    await page.goto('/admin/isos')
    await expect(page.getByRole('heading', { name: 'ISO 镜像' })).toBeVisible()
    await page.getByRole('button', { name: '创建 ISO' }).click()
    await expect(page.getByText('创建 ISO 记录')).toBeVisible()
  })

  test('VPC 管理 - 点击创建打开对话框', async ({ page }) => {
    await page.goto('/admin/vpcs')
    await expect(page.getByRole('heading', { name: 'VPC 管理' })).toBeVisible()
    await page.getByRole('button', { name: '创建 VPC' }).click()
    await expect(page.getByText('创建 VPC')).toBeVisible()
  })
})
