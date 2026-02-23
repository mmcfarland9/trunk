import { defineConfig } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/e2e-tester.json'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Auth setup — runs first, authenticates as E2E Tester, saves storageState
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // All E2E tests — run authenticated with the saved storageState
    {
      name: 'e2e',
      dependencies: ['setup'],
      use: { storageState: AUTH_FILE },
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
