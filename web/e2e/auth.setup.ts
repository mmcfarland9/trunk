/**
 * Playwright auth setup — authenticates as E2E Tester via the e2e-login
 * edge function and saves the browser storageState for all test projects.
 *
 * Runs once before all tests. Other projects depend on this via
 * `dependencies: ['setup']` in playwright.config.ts.
 */

import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/e2e-tester.json'

setup('authenticate as E2E Tester', async ({ page }) => {
  // Navigate with ?e2e to trigger automatic auth via the edge function
  await page.goto('/?e2e')

  // Wait for the app shell to appear (means auth succeeded and app loaded)
  await page.waitForSelector('.canvas', { timeout: 15000 })

  // Verify we're actually logged in — profile badge should be visible
  await expect(page.locator('.profile-badge')).not.toHaveClass(/hidden/, {
    timeout: 5000,
  })

  // Save the authenticated storageState (includes Supabase tokens in localStorage)
  await page.context().storageState({ path: AUTH_FILE })
})
