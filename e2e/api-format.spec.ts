import { test, expect } from '@playwright/test'

test.describe('API 响应格式', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('API 404 返回 JSON 而非 HTML', async ({ request }) => {
    const resp = await request.get('/api/v1/nonexistent-endpoint')
    expect(resp.status()).toBe(404)
    const body = await resp.json()
    expect(body).toHaveProperty('code')
    expect(body).toHaveProperty('message')
  })

  test('未认证访问受保护 API 返回 401', async ({ request }) => {
    const resp = await request.get('/api/v1/admin/ping')
    expect(resp.status()).toBe(401)
    const body = await resp.json()
    expect(body).toHaveProperty('code')
  })
})
