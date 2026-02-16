/**
 * E2E tests for Water Can dialog, Soil Bag dialog, and sidebar sprout lists.
 * Tests the log history modals and sidebar Growing/Cultivated sections.
 */

import { test, expect } from '@playwright/test'

// --- Helpers ---

/** Create a standard set of events: leaf + planted sprout on branch-0-twig-0 */
function makePlantedSproutEvents(options?: {
  sproutId?: string
  leafId?: string
  title?: string
  daysAgo?: number
  season?: string
  environment?: string
  soilCost?: number
  leafName?: string
}) {
  const now = new Date()
  const daysAgo = options?.daysAgo ?? 2
  const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  const leafId = options?.leafId ?? 'test-leaf'
  const sproutId = options?.sproutId ?? 'test-sprout'

  return [
    {
      type: 'leaf_created',
      timestamp: pastDate.toISOString(),
      leafId,
      twigId: 'branch-0-twig-0',
      name: options?.leafName ?? 'Test Saga',
    },
    {
      type: 'sprout_planted',
      timestamp: pastDate.toISOString(),
      sproutId,
      twigId: 'branch-0-twig-0',
      leafId,
      title: options?.title ?? 'Test Sprout',
      season: options?.season ?? '2w',
      environment: options?.environment ?? 'fertile',
      soilCost: options?.soilCost ?? 2,
    },
  ]
}

/** Create a watered event for a sprout */
function makeWaterEvent(sproutId: string, content: string, minutesAgo?: number) {
  const now = new Date()
  const timestamp = minutesAgo
    ? new Date(now.getTime() - minutesAgo * 60 * 1000)
    : now
  return {
    type: 'sprout_watered',
    timestamp: timestamp.toISOString(),
    sproutId,
    content,
    prompt: 'Test prompt',
  }
}

/** Create a harvested event for a sprout */
function makeHarvestEvent(sproutId: string, result: number, capacityGained: number) {
  return {
    type: 'sprout_harvested',
    timestamp: new Date().toISOString(),
    sproutId,
    result,
    reflection: 'Test reflection',
    capacityGained,
  }
}

// =========================================================================
// Water Can Dialog
// =========================================================================

test.describe('Water Can Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('clicking water meter opens water can dialog', async ({ page }) => {
    await page.click('.water-meter')
    await page.waitForSelector('.water-can-dialog:not(.hidden)')

    const dialog = page.locator('.water-can-dialog')
    await expect(dialog).not.toHaveClass(/hidden/)

    // Title should say "Watering Can"
    const title = page.locator('.water-can-dialog-title')
    await expect(title).toHaveText('Watering Can')
  })

  test('water can dialog shows remaining water count', async ({ page }) => {
    await page.click('.water-meter')
    await page.waitForSelector('.water-can-dialog:not(.hidden)')

    // With no water events, should show 3/3 remaining
    const statusText = page.locator('.water-can-status-text')
    await expect(statusText).toContainText('3/3 remaining')

    // Reset time should be hidden when water is available
    const resetText = page.locator('.water-can-status-reset')
    await expect(resetText).toHaveClass(/hidden/)
  })

  test('water can dialog shows water log entries after watering', async ({ page }) => {
    // Set up a sprout + water event
    await page.evaluate((events) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, [
      ...makePlantedSproutEvents({ title: 'Morning Run' }),
      makeWaterEvent('test-sprout', 'Did a 5k today', 30),
    ])

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    await page.click('.water-meter')
    await page.waitForSelector('.water-can-dialog:not(.hidden)')

    // Log entries should be visible (not empty state)
    const emptyLog = page.locator('.water-can-empty-log')
    const emptyDisplay = await emptyLog.evaluate(el => getComputedStyle(el).display)
    expect(emptyDisplay).toBe('none')

    const logEntries = page.locator('.water-can-log-entries')
    const entriesDisplay = await logEntries.evaluate(el => getComputedStyle(el).display)
    expect(entriesDisplay).toBe('flex')

    // Entry should contain sprout title and content
    const entry = page.locator('.water-can-log-entry').first()
    await expect(entry).toBeVisible()
    await expect(entry.locator('.water-can-log-entry-context')).toContainText('Morning Run')
    await expect(entry.locator('.water-can-log-entry-content')).toContainText('Did a 5k today')

    // Verify timestamp is shown
    await expect(entry.locator('.water-can-log-entry-timestamp')).not.toBeEmpty()
  })

  test('water can dialog shows empty state with no entries', async ({ page }) => {
    await page.click('.water-meter')
    await page.waitForSelector('.water-can-dialog:not(.hidden)')

    // Empty state should be visible
    const emptyLog = page.locator('.water-can-empty-log')
    const emptyDisplay = await emptyLog.evaluate(el => getComputedStyle(el).display)
    expect(emptyDisplay).toBe('block')

    // Entries container should be hidden
    const logEntries = page.locator('.water-can-log-entries')
    const entriesDisplay = await logEntries.evaluate(el => getComputedStyle(el).display)
    expect(entriesDisplay).toBe('none')

    // Empty message text
    await expect(emptyLog).toContainText('No water entries yet')
  })
})

// =========================================================================
// Soil Bag Dialog
// =========================================================================

test.describe('Soil Bag Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('clicking soil meter opens soil bag dialog', async ({ page }) => {
    await page.click('.soil-meter')
    await page.waitForSelector('.soil-bag-dialog:not(.hidden)')

    const dialog = page.locator('.soil-bag-dialog')
    await expect(dialog).not.toHaveClass(/hidden/)

    // Title should say "Soil Bag"
    const title = page.locator('.soil-bag-dialog-title')
    await expect(title).toHaveText('Soil Bag')
  })

  test('soil bag dialog shows soil changes after planting', async ({ page }) => {
    // Set up a planted sprout (costs 2 soil)
    await page.evaluate((events) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, makePlantedSproutEvents({ title: 'Learn Piano', soilCost: 2 }))

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    await page.click('.soil-meter')
    await page.waitForSelector('.soil-bag-dialog:not(.hidden)')

    // Should show entry for planting (negative soil)
    const entry = page.locator('.soil-bag-entry').first()
    await expect(entry).toBeVisible()

    // Reason should indicate planting
    await expect(entry.locator('.soil-bag-entry-reason')).toContainText('Planted sprout')

    // Amount should be negative (loss)
    const amount = entry.locator('.soil-bag-entry-amount')
    await expect(amount).toHaveClass(/is-loss/)
    await expect(amount).toContainText('-2.00')

    // Context should show sprout title
    await expect(entry.locator('.soil-bag-entry-context')).toContainText('Learn Piano')
  })

  test('soil bag dialog shows soil gains from watering', async ({ page }) => {
    // Set up sprout + water event
    await page.evaluate((events) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, [
      ...makePlantedSproutEvents({ title: 'Study Math' }),
      makeWaterEvent('test-sprout', 'Solved equations', 10),
    ])

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    await page.click('.soil-meter')
    await page.waitForSelector('.soil-bag-dialog:not(.hidden)')

    // Should have 2 entries: plant (loss) and water (gain)
    const entries = page.locator('.soil-bag-entry')
    await expect(entries).toHaveCount(2)

    // First entry (newest) should be the water gain (entries reversed - newest first)
    const waterEntry = entries.first()
    await expect(waterEntry.locator('.soil-bag-entry-reason')).toContainText('Watered sprout')
    const waterAmount = waterEntry.locator('.soil-bag-entry-amount')
    await expect(waterAmount).toHaveClass(/is-gain/)
    await expect(waterAmount).toContainText('+0.05')
  })

  test('soil bag dialog entries are ordered newest first', async ({ page }) => {
    // Set up multiple events with different timestamps
    const now = new Date()
    const day3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const day2Ago = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const day1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

    const events = [
      {
        type: 'leaf_created',
        timestamp: day3Ago.toISOString(),
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga A',
      },
      {
        type: 'sprout_planted',
        timestamp: day3Ago.toISOString(),
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        leafId: 'leaf-1',
        title: 'First Sprout',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_watered',
        timestamp: day2Ago.toISOString(),
        sproutId: 'sprout-1',
        content: 'Water entry 1',
        prompt: 'prompt',
      },
      {
        type: 'sprout_watered',
        timestamp: day1Ago.toISOString(),
        sproutId: 'sprout-1',
        content: 'Water entry 2',
        prompt: 'prompt',
      },
    ]

    await page.evaluate((evts) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(evts))
    }, events)

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    await page.click('.soil-meter')
    await page.waitForSelector('.soil-bag-dialog:not(.hidden)')

    // Should have 3 entries: plant + 2 waters
    const entries = page.locator('.soil-bag-entry')
    await expect(entries).toHaveCount(3)

    // First entry (newest) should be the most recent water
    const firstReason = await entries.nth(0).locator('.soil-bag-entry-reason').textContent()
    expect(firstReason).toContain('Watered sprout')

    // Last entry (oldest) should be the planting
    const lastReason = await entries.nth(2).locator('.soil-bag-entry-reason').textContent()
    expect(lastReason).toContain('Planted sprout')
  })
})

// =========================================================================
// Sidebar Sprout Lists
// =========================================================================

test.describe('Sidebar Sprout Lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('Growing section shows active sprouts', async ({ page }) => {
    // Plant a sprout
    await page.evaluate((events) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, makePlantedSproutEvents({ title: 'Active Goal' }))

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Growing section should show count of 1
    const activeToggle = page.locator('.sprouts-toggle[data-section="active"]')
    const count = activeToggle.locator('.sprouts-toggle-count')
    await expect(count).toHaveText('(1)')

    // Active sprouts list should contain the sprout title
    const activeList = page.locator('.sprouts-list[data-section="active"]')
    await expect(activeList).toContainText('Active Goal')

    // Verify the sprout data integrity: event log should have the planted event
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })
    const plantedEvent = events.find((e: any) => e.type === 'sprout_planted')
    expect(plantedEvent).toBeDefined()
    expect(plantedEvent.title).toBe('Active Goal')
  })

  test('Cultivated section shows completed sprouts', async ({ page }) => {
    // Set up a sprout that's been planted and harvested
    const plantEvents = makePlantedSproutEvents({
      title: 'Completed Goal',
      daysAgo: 15,
    })
    const harvestEvent = makeHarvestEvent('test-sprout', 4, 0.5)

    await page.evaluate((events) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, [...plantEvents, harvestEvent])

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Cultivated section should show count of 1
    const cultivatedToggle = page.locator('.sprouts-toggle[data-section="cultivated"]')
    const count = cultivatedToggle.locator('.sprouts-toggle-count')
    await expect(count).toHaveText('(1)')

    // Cultivated list should contain the sprout title
    const cultivatedList = page.locator('.sprouts-list[data-section="cultivated"]')
    await expect(cultivatedList).toContainText('Completed Goal')

    // Growing section should show 0 active sprouts
    const activeToggle = page.locator('.sprouts-toggle[data-section="active"]')
    const activeCount = activeToggle.locator('.sprouts-toggle-count')
    await expect(activeCount).toHaveText('(0)')

    // Data integrity: event log should have both planted and harvested events
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })
    const harvestedEvent = events.find((e: any) => e.type === 'sprout_harvested')
    expect(harvestedEvent).toBeDefined()
    expect(harvestedEvent.result).toBe(4)
  })

  test('sidebar sprout sections are collapsible', async ({ page }) => {
    // Plant a sprout so Growing section has content
    await page.evaluate((events) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, makePlantedSproutEvents({ title: 'Collapsible Test' }))

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    const activeToggle = page.locator('.sprouts-toggle[data-section="active"]')
    const activeList = page.locator('.sprouts-list[data-section="active"]')

    // Initially expanded
    await expect(activeToggle).toHaveClass(/is-expanded/)
    await expect(activeList).not.toHaveClass(/is-collapsed/)

    // Click to collapse
    await activeToggle.click()
    await expect(activeToggle).not.toHaveClass(/is-expanded/)
    await expect(activeList).toHaveClass(/is-collapsed/)

    // Click again to re-expand
    await activeToggle.click()
    await expect(activeToggle).toHaveClass(/is-expanded/)
    await expect(activeList).not.toHaveClass(/is-collapsed/)
  })

  test('sidebar water button opens water dialog', async ({ page }) => {
    // Plant a sprout so sidebar has a water button
    await page.evaluate((events) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, makePlantedSproutEvents({ title: 'Water Me' }))

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Find and click the sidebar water button
    const waterBtn = page.locator('.sprouts-list[data-section="active"] .action-btn-water').first()
    await expect(waterBtn).toBeVisible()
    await waterBtn.click()

    // Water dialog should open
    const dialog = page.locator('.water-dialog')
    await expect(dialog).not.toHaveClass(/hidden/)

    // Dialog should show the sprout name
    await expect(page.locator('.water-dialog-sprout-name')).toContainText('Water Me')
  })

  test('sidebar shows sprout count in section headers', async ({ page }) => {
    // Plant two sprouts
    const now = new Date()
    const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    const events = [
      {
        type: 'leaf_created',
        timestamp: pastDate.toISOString(),
        leafId: 'leaf-a',
        twigId: 'branch-0-twig-0',
        name: 'Saga A',
      },
      {
        type: 'sprout_planted',
        timestamp: pastDate.toISOString(),
        sproutId: 'sprout-a',
        twigId: 'branch-0-twig-0',
        leafId: 'leaf-a',
        title: 'Sprout A',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'leaf_created',
        timestamp: pastDate.toISOString(),
        leafId: 'leaf-b',
        twigId: 'branch-0-twig-1',
        name: 'Saga B',
      },
      {
        type: 'sprout_planted',
        timestamp: pastDate.toISOString(),
        sproutId: 'sprout-b',
        twigId: 'branch-0-twig-1',
        leafId: 'leaf-b',
        title: 'Sprout B',
        season: '1m',
        environment: 'firm',
        soilCost: 5,
      },
    ]

    await page.evaluate((evts) => {
      localStorage.setItem('trunk-events-v1', JSON.stringify(evts))
    }, events)

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Active section count should show 2
    const activeCount = page.locator('.sprouts-toggle[data-section="active"] .sprouts-toggle-count')
    await expect(activeCount).toHaveText('(2)')

    // Cultivated section count should show 0
    const cultivatedCount = page.locator('.sprouts-toggle[data-section="cultivated"] .sprouts-toggle-count')
    await expect(cultivatedCount).toHaveText('(0)')

    // Data integrity: verify both sprouts exist in event log
    const storedEvents = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })
    const plantedEvents = storedEvents.filter((e: any) => e.type === 'sprout_planted')
    expect(plantedEvents).toHaveLength(2)
  })
})
