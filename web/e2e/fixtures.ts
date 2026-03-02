/**
 * Shared Playwright fixtures for authenticated E2E tests.
 *
 * Usage:  import { test, expect } from './fixtures'
 *
 * Provides:
 * - Pre-authenticated page (E2E Tester via storageState)
 * - `resetAppState(page)` — clears app data while preserving auth tokens
 */

import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Clear app-specific localStorage (events, etc.) without wiping the
 * Supabase auth token. Call this in beforeEach instead of localStorage.clear().
 */
export async function resetAppState(page: Page): Promise<void> {
  await page.evaluate(() => {
    const authKeys: [string, string][] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      // Preserve Supabase auth tokens (sb-<ref>-auth-token)
      if (key.startsWith('sb-')) {
        authKeys.push([key, localStorage.getItem(key)!])
      }
    }
    localStorage.clear()
    for (const [k, v] of authKeys) {
      localStorage.setItem(k, v)
    }
  })
}

/**
 * Seed events into localStorage (app's event store key).
 * Preserves any existing Supabase auth tokens.
 */
export async function seedEvents(page: Page, events: unknown[]): Promise<void> {
  await page.evaluate((evts) => {
    localStorage.setItem('trunk-events-v1', JSON.stringify(evts))
  }, events)
}

/**
 * Block Supabase REST API sync so tests run against local state only.
 * GET /events is aborted (app falls back to localStorage cache).
 * POST/PATCH returns 201 (push appears to succeed, no retry loops).
 */
async function isolateFromSupabase(page: Page): Promise<void> {
  await page.route('**/rest/v1/events**', (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      route.abort('connectionrefused')
    } else {
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    }
  })
}

/**
 * Extended test fixture that automatically blocks Supabase sync.
 * All E2E tests run against local state only — no cross-test pollution via server.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await isolateFromSupabase(page)
    await use(page)
  },
})
export { expect }
