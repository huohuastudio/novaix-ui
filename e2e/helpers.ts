import type { Page } from '@playwright/test'

export const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin'
export const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'test123456'

export async function getTokenFromPage(page: Page): Promise<string> {
  const state = await page.context().storageState()
  return state.origins.flatMap(o => o.localStorage).find(i => i.name === 'token')?.value ?? ''
}

export async function fillRichEditor(page: Page, text: string) {
  await page.locator('.ProseMirror').click()
  await page.locator('.ProseMirror').fill(text)
}

export async function openPortalUserMenu(page: Page) {
  await page.locator('[data-tour="portal-user-menu"]').click()
}

export async function clickSidebarNav(page: Page, name: string) {
  await page.locator('[data-sidebar="menu-button"]', { hasText: name }).click()
}

export async function clickAdminUserMenu(page: Page) {
  await page.locator('[data-sidebar="menu-button"][data-size="lg"]').click()
}
