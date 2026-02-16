/**
 * E2E tests for the uproot (delete) sprout flow.
 * Tests the confirmation dialog, event creation, soil refund, and UI updates.
 */

import { test, expect } from '@playwright/test'

/** Soil uproot refund rate from shared/constants.json */
const SOIL_UPROOT_REFUND_RATE = 0.25
const STARTING_SOIL = 10

/**
 * Helper: seed localStorage with a leaf + active sprout on branch-0-twig-0,
 * then reload and wait for canvas.
 */
async function seedSproutAndReload(
  page: import('@playwright/test').Page,
  opts: {
    sproutId?: string
    leafId?: string
    soilCost?: number
    season?: string
    environment?: string
    title?: string
  } = {},
) {
  const {
    sproutId = 'test-sprout',
    leafId = 'test-leaf',
    soilCost = 2,
    season = '2w',
    environment = 'fertile',
    title = 'Uproot Me',
  } = opts

  await page.evaluate(
    ({ sproutId, leafId, soilCost, season, environment, title }) => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId,
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId,
          twigId: 'branch-0-twig-0',
          leafId,
          title,
          season,
          environment,
          soilCost,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    },
    { sproutId, leafId, soilCost, season, environment, title },
  )

  await page.reload()
  await page.waitForSelector('.canvas')
  await page.waitForTimeout(500)
}

/**
 * Helper: navigate from overview into the twig view for branch-0-twig-0.
 */
async function navigateToTwig(page: import('@playwright/test').Page) {
  await page.click('.node.branch', { force: true })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.canvas')
    return canvas?.classList.contains('is-zoomed')
  })
  await page.evaluate(() => {
    const twig = document.querySelector(
      '.branch-group.is-active .node.twig',
    ) as HTMLElement
    twig?.click()
  })
  await page.waitForSelector('.twig-view:not(.hidden)')
}

test.describe('Uproot Sprout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('uproot button is visible on active sprout card', async ({ page }) => {
    await seedSproutAndReload(page)
    await navigateToTwig(page)

    // The active sprout card should be visible in the Growing column
    const activeCard = page.locator('.sprout-active-card')
    await expect(activeCard).toBeVisible()
    await expect(activeCard).toContainText('Uproot Me')

    // The delete/uproot button (x) should exist on the card
    const uprootBtn = activeCard.locator('.sprout-delete-btn')
    await expect(uprootBtn).toBeVisible()
    await expect(uprootBtn).toHaveAttribute('aria-label', 'Uproot')
  })

  test('uproot shows confirmation dialog', async ({ page }) => {
    await seedSproutAndReload(page)
    await navigateToTwig(page)

    // Click the uproot button
    const uprootBtn = page.locator('.sprout-delete-btn').first()
    await uprootBtn.click()

    // Confirmation dialog should appear
    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).not.toHaveClass(/hidden/)

    // Should display a confirmation message mentioning soil return
    const message = page.locator('.confirm-dialog-message')
    await expect(message).toBeVisible()
    const messageText = await message.textContent()
    expect(messageText).toContain('Are you sure you want to uproot')

    // Soil return amount: 2 * 0.25 = 0.5
    expect(messageText).toContain('+0.5 soil returned')

    // Cancel and Confirm buttons should be present
    const cancelBtn = page.locator('.confirm-dialog-cancel')
    const confirmBtn = page.locator('.confirm-dialog-confirm')
    await expect(cancelBtn).toBeVisible()
    await expect(confirmBtn).toBeVisible()
    await expect(confirmBtn).toHaveText('Uproot')
  })

  test('confirming uproot creates sprout_uprooted event', async ({ page }) => {
    await seedSproutAndReload(page)
    await navigateToTwig(page)

    // Click uproot, then confirm
    await page.locator('.sprout-delete-btn').first().click()
    await page.waitForSelector('.confirm-dialog:not(.hidden)')
    await page.locator('.confirm-dialog-confirm').click()
    await page.waitForTimeout(300)

    // Verify sprout_uprooted event in localStorage
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const uprootEvent = events.find(
      (e: any) => e.type === 'sprout_uprooted',
    )
    expect(uprootEvent).toBeDefined()
    expect(uprootEvent.sproutId).toBe('test-sprout')
    expect(uprootEvent.soilReturned).toBe(2 * SOIL_UPROOT_REFUND_RATE) // 0.5
    expect(uprootEvent.timestamp).toBeTruthy()

    // There should be exactly 3 events: leaf_created, sprout_planted, sprout_uprooted
    expect(events).toHaveLength(3)
    expect(events[0].type).toBe('leaf_created')
    expect(events[1].type).toBe('sprout_planted')
    expect(events[2].type).toBe('sprout_uprooted')
  })

  test('uproot returns partial soil refund', async ({ page }) => {
    // Use a more expensive sprout to make refund more visible
    // 3m + barren = soilCost 10, refund = 10 * 0.25 = 2.5
    await seedSproutAndReload(page, {
      soilCost: 10,
      season: '3m',
      environment: 'barren',
    })

    // After planting a 10-cost sprout, soil = 10 - 10 = 0
    // After uproot refund: 0 + 2.5 = 2.5
    await navigateToTwig(page)

    // Uproot the sprout
    await page.locator('.sprout-delete-btn').first().click()
    await page.waitForSelector('.confirm-dialog:not(.hidden)')
    await page.locator('.confirm-dialog-confirm').click()
    await page.waitForTimeout(300)

    // Verify soil state via derived events
    const soilState = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      const events = raw ? JSON.parse(raw) : []

      // Replay events to derive soil (mirrors derive.ts logic)
      let soilCapacity = 10
      let soilAvailable = 10

      for (const event of events) {
        if (event.type === 'sprout_planted') {
          soilAvailable = Math.max(0, soilAvailable - event.soilCost)
        } else if (event.type === 'sprout_uprooted') {
          soilAvailable = Math.min(
            soilAvailable + event.soilReturned,
            soilCapacity,
          )
        }
      }

      return { soilCapacity, soilAvailable }
    })

    expect(soilState.soilCapacity).toBe(STARTING_SOIL)
    expect(soilState.soilAvailable).toBe(2.5) // 0 + (10 * 0.25) = 2.5

    // Also verify the uproot event has correct soilReturned value
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })
    const uprootEvent = events.find(
      (e: any) => e.type === 'sprout_uprooted',
    )
    expect(uprootEvent.soilReturned).toBe(2.5)
  })

  test('uproot removes sprout from active list', async ({ page }) => {
    await seedSproutAndReload(page)
    await navigateToTwig(page)

    // Verify sprout is initially visible in Growing column
    const activeCard = page.locator('.sprout-active-card')
    await expect(activeCard).toBeVisible()
    await expect(activeCard).toContainText('Uproot Me')

    // Uproot the sprout
    await page.locator('.sprout-delete-btn').first().click()
    await page.waitForSelector('.confirm-dialog:not(.hidden)')
    await page.locator('.confirm-dialog-confirm').click()
    await page.waitForTimeout(300)

    // Sprout should no longer appear in the Growing section
    const activeCards = page.locator('.sprout-active-card')
    await expect(activeCards).toHaveCount(0)

    // The Growing column should show "No growing sprouts"
    const emptyMessage = page.locator('.sprout-active .empty-message')
    await expect(emptyMessage).toBeVisible()
    await expect(emptyMessage).toHaveText('No growing sprouts')
  })

  test('canceling uproot keeps sprout active', async ({ page }) => {
    await seedSproutAndReload(page)
    await navigateToTwig(page)

    // Click uproot to open confirmation
    await page.locator('.sprout-delete-btn').first().click()
    await page.waitForSelector('.confirm-dialog:not(.hidden)')

    // Click Cancel
    await page.locator('.confirm-dialog-cancel').click()
    await page.waitForTimeout(200)

    // Confirmation dialog should be hidden
    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toHaveClass(/hidden/)

    // Sprout should still be visible in the Growing column
    const activeCard = page.locator('.sprout-active-card')
    await expect(activeCard).toBeVisible()
    await expect(activeCard).toContainText('Uproot Me')

    // Verify no sprout_uprooted event was created
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const uprootEvent = events.find(
      (e: any) => e.type === 'sprout_uprooted',
    )
    expect(uprootEvent).toBeUndefined()

    // Should still only have the original 2 events
    expect(events).toHaveLength(2)
  })

  test('uprooted sprout does not appear in Cultivated section', async ({
    page,
  }) => {
    // Uprooted sprouts have state 'uprooted' (not 'completed'),
    // so they should NOT show in the Cultivated column.
    await seedSproutAndReload(page)
    await navigateToTwig(page)

    // Uproot the sprout
    await page.locator('.sprout-delete-btn').first().click()
    await page.waitForSelector('.confirm-dialog:not(.hidden)')
    await page.locator('.confirm-dialog-confirm').click()
    await page.waitForTimeout(300)

    // Sprout should be gone from Growing
    const activeCards = page.locator('.sprout-active-card')
    await expect(activeCards).toHaveCount(0)

    // Sprout should NOT appear in Cultivated section either
    // (uprooted != completed)
    const historyCards = page.locator('.sprout-history-card')
    await expect(historyCards).toHaveCount(0)

    // Cultivated column should show "No history"
    const emptyHistory = page.locator('.sprout-history .empty-message')
    await expect(emptyHistory).toBeVisible()
    await expect(emptyHistory).toHaveText('No history')

    // Confirm via data integrity: the sprout_uprooted event exists
    // and the sprout is 'uprooted' state (not 'completed')
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const uprootEvent = events.find(
      (e: any) => e.type === 'sprout_uprooted',
    )
    expect(uprootEvent).toBeDefined()

    // Verify no harvest event (which would make it 'completed')
    const harvestEvent = events.find(
      (e: any) => e.type === 'sprout_harvested',
    )
    expect(harvestEvent).toBeUndefined()
  })
})
