import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'admin',
      testMatch: /admin-.*\.spec\.ts/,
      use: {
        browserName: 'chromium',
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'portal',
      testMatch: /portal-.*\.spec\.ts/,
      use: {
        browserName: 'chromium',
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'common',
      testMatch: /(not-found|home|legal|api-format|public-cms)\.spec\.ts/,
      use: {
        browserName: 'chromium',
      },
    },
  ],
})
