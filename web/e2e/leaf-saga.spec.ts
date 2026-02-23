/**
 * E2E tests for leaf/saga lifecycle and leaf view navigation.
 *
 * Tests leaf creation, dropdown population, leaf view opening/closing,
 * saga timeline rendering, and data integrity across multiple sprouts.
 *
 * DOM structure reference:
 * - Leaf view: .leaf-view (open state: .is-open)
 *   - Close button: .leaf-close-btn
 *   - Timeline log: .leaf-log
 *   - Log entries: .log-entry-start (planted), .log-entry-water (watered),
 *                  .log-entry-completion (harvested), .log-entry-uprooted
 * - Twig view leaf cards: .leaf-card[data-action="open-leaf"]
 * - Sprout cards with leaf: .sprout-card[data-action="open-leaf"]
 */

import { test, expect, resetAppState } from './fixtures'
import type { Page } from '@playwright/test'

/** Navigate from overview to branch-0, twig-0 */
async function navigateToTwig(page: Page): Promise<void> {
  await page.click('.node.branch', { force: true })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.canvas')
    return canvas && canvas.classList.contains('is-zoomed')
  })
  await page.evaluate(() => {
    const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
    twig?.click()
  })
  await page.waitForSelector('.twig-view:not(.hidden)')
}

/** Reopen twig view when already in branch view */
async function reopenTwig(page: Page): Promise<void> {
  await page.evaluate(() => {
    const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
    twig?.click()
  })
  await page.waitForSelector('.twig-view:not(.hidden)')
}

/** Open leaf view by clicking the sprout card title (non-button area triggers open-leaf) */
async function openLeafView(page: Page): Promise<void> {
  await page.click('.sprout-card-title')
  await page.waitForSelector('.leaf-view.is-open')
}

test.describe('Leaf/Saga Lifecycle and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await resetAppState(page)
    await page.reload()
    await page.waitForSelector('.canvas')
  })

  // ── LEAF CREATION ──────────────────────────────────────────────────────────

  test('creating a sprout with new leaf creates leaf_created event', async ({ page }) => {
    await navigateToTwig(page)

    // Select "new leaf" and provide name
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'My Saga')

    // Fill sprout form
    await page.fill('.sprout-title-input', 'Saga Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')

    // Plant
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Verify events in localStorage
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    // leaf_created event exists with correct data
    const leafEvent = events.find((e: any) => e.type === 'leaf_created')
    expect(leafEvent).toBeDefined()
    expect(leafEvent.name).toBe('My Saga')
    expect(leafEvent.twigId).toMatch(/^branch-\d+-twig-\d+$/)
    expect(leafEvent.leafId).toBeTruthy()

    // sprout_planted references the same leafId
    const plantEvent = events.find((e: any) => e.type === 'sprout_planted')
    expect(plantEvent).toBeDefined()
    expect(plantEvent.leafId).toBe(leafEvent.leafId)
    expect(plantEvent.title).toBe('Saga Sprout')

    // leaf_created timestamp precedes or equals sprout_planted timestamp
    expect(new Date(leafEvent.timestamp).getTime())
      .toBeLessThanOrEqual(new Date(plantEvent.timestamp).getTime())
  })

  test('leaf dropdown shows existing leaves', async ({ page }) => {
    await navigateToTwig(page)

    // Create first sprout with a new leaf
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Existing Saga')
    await page.fill('.sprout-title-input', 'First Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Close and reopen twig view to repopulate dropdown
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => {
      const twigView = document.querySelector('.twig-view')
      return twigView && twigView.classList.contains('hidden')
    })
    await reopenTwig(page)

    // Verify the leaf appears in the dropdown
    const options = await page.$$eval('.sprout-leaf-select option', opts =>
      opts.map(o => ({
        value: (o as HTMLOptionElement).value,
        text: o.textContent?.trim(),
      }))
    )

    const existingLeaf = options.find(o => o.text === 'Existing Saga')
    expect(existingLeaf).toBeDefined()
    expect(existingLeaf!.value).toBeTruthy()
    // Should be a real leafId, not the placeholder or __new__
    expect(existingLeaf!.value).not.toBe('__new__')
    expect(existingLeaf!.value).not.toBe('')
  })

  test('assigning sprout to existing leaf reuses leafId', async ({ page }) => {
    await navigateToTwig(page)

    // Create first sprout with new leaf
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Shared Saga')
    await page.fill('.sprout-title-input', 'First Goal')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    // Wait for button to be enabled, then plant
    await page.locator('.sprout-set-btn').click()
    // Wait for the first sprout to appear in Growing list
    await page.waitForSelector('.active-sprouts-list .sprout-card')

    // Read the leafId from events
    const firstEvents = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })
    const leafId = firstEvents.find((e: any) => e.type === 'leaf_created').leafId

    // Close and reopen twig view so dropdown repopulates
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => {
      const twigView = document.querySelector('.twig-view')
      return twigView && twigView.classList.contains('hidden')
    })
    await reopenTwig(page)

    // Select the existing leaf and create second sprout
    await page.selectOption('.sprout-leaf-select', leafId)
    await page.fill('.sprout-title-input', 'Second Goal')
    await page.click('.sprout-season-btn[data-season="1m"]')
    await page.click('.sprout-env-btn[data-env="firm"]')
    // Ensure preventDoubleClick lock (500ms) from first plant has expired
    await page.waitForTimeout(600)
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Verify both sprout_planted events share the same leafId
    const allEvents = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const plantEvents = allEvents.filter((e: any) => e.type === 'sprout_planted')
    expect(plantEvents).toHaveLength(2)
    expect(plantEvents[0].leafId).toBe(leafId)
    expect(plantEvents[1].leafId).toBe(leafId)

    // Only one leaf_created event (leaf was reused, not duplicated)
    const leafEvents = allEvents.filter((e: any) => e.type === 'leaf_created')
    expect(leafEvents).toHaveLength(1)
  })

  // ── LEAF VIEW NAVIGATION ──────────────────────────────────────────────────

  test('clicking leaf card in twig view opens leaf view', async ({ page }) => {
    // Seed events with leaf + active sprout
    await page.evaluate(() => {
      const events = [
        {
          type: 'leaf_created',
          timestamp: new Date().toISOString(),
          leafId: 'leaf-nav-1',
          twigId: 'branch-0-twig-0',
          name: 'Navigation Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sprout-nav-1',
          twigId: 'branch-0-twig-0',
          leafId: 'leaf-nav-1',
          title: 'Navigate Test',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })
    await page.reload()
    await page.waitForSelector('.canvas')

    await navigateToTwig(page)

    // Click sprout card title (non-button) to trigger open-leaf action
    await openLeafView(page)

    // Leaf view should be open
    const leafView = page.locator('.leaf-view')
    await expect(leafView).toHaveClass(/is-open/)

    // Twig view should be hidden (leaf view replaces it)
    const twigView = page.locator('.twig-view')
    await expect(twigView).toHaveClass(/hidden/)
  })

  test('leaf view shows saga timeline with planted event', async ({ page }) => {
    await page.evaluate(() => {
      const events = [
        {
          type: 'leaf_created',
          timestamp: '2026-01-01T12:00:00.000Z',
          leafId: 'leaf-timeline-1',
          twigId: 'branch-0-twig-0',
          name: 'Timeline Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T12:00:00.000Z',
          sproutId: 'sprout-timeline-1',
          twigId: 'branch-0-twig-0',
          leafId: 'leaf-timeline-1',
          title: 'Timeline Sprout',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
          bloomWither: 'Gave up',
          bloomBudding: 'Some progress',
          bloomFlourish: 'Mastered it',
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })
    await page.reload()
    await page.waitForSelector('.canvas')

    await navigateToTwig(page)
    await openLeafView(page)

    // Planted entry appears in timeline
    const plantedEntry = page.locator('.log-entry-start')
    await expect(plantedEntry).toBeVisible()
    await expect(plantedEntry).toContainText('Planted')
    await expect(plantedEntry).toContainText('Timeline Sprout')

    // Bloom descriptions are rendered
    await expect(plantedEntry).toContainText('Gave up')
    await expect(plantedEntry).toContainText('Some progress')
    await expect(plantedEntry).toContainText('Mastered it')

    // Season and environment metadata shown
    await expect(plantedEntry).toContainText('1 month')
    await expect(plantedEntry).toContainText('Firm')
  })

  test('leaf view shows watering entries', async ({ page }) => {
    const plantedAt = '2026-02-01T12:00:00.000Z'
    const wateredAt = '2026-02-02T10:00:00.000Z'

    await page.evaluate(({ plantedAt, wateredAt }) => {
      const events = [
        {
          type: 'leaf_created',
          timestamp: plantedAt,
          leafId: 'leaf-water-1',
          twigId: 'branch-0-twig-0',
          name: 'Water Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: plantedAt,
          sproutId: 'sprout-water-1',
          twigId: 'branch-0-twig-0',
          leafId: 'leaf-water-1',
          title: 'Watered Sprout',
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
        },
        {
          type: 'sprout_watered',
          timestamp: wateredAt,
          sproutId: 'sprout-water-1',
          content: 'Made solid progress today',
          prompt: 'How did it go?',
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, { plantedAt, wateredAt })

    await page.reload()
    await page.waitForSelector('.canvas')

    await navigateToTwig(page)
    await openLeafView(page)

    // Watering entry appears in timeline
    const waterEntry = page.locator('.log-entry-water')
    await expect(waterEntry).toBeVisible()
    await expect(waterEntry).toContainText('Watered')
    await expect(waterEntry).toContainText('Made solid progress today')

    // Planted entry also present
    const plantedEntry = page.locator('.log-entry-start')
    await expect(plantedEntry).toBeVisible()
  })

  test('closing leaf view returns to twig view', async ({ page }) => {
    await page.evaluate(() => {
      const events = [
        {
          type: 'leaf_created',
          timestamp: new Date().toISOString(),
          leafId: 'leaf-close-1',
          twigId: 'branch-0-twig-0',
          name: 'Close Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sprout-close-1',
          twigId: 'branch-0-twig-0',
          leafId: 'leaf-close-1',
          title: 'Close Test',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })
    await page.reload()
    await page.waitForSelector('.canvas')

    await navigateToTwig(page)
    await openLeafView(page)

    // Click close button
    await page.click('.leaf-close-btn')

    // Leaf view should close
    await page.waitForFunction(() => {
      const leafView = document.querySelector('.leaf-view')
      return leafView && !leafView.classList.contains('is-open')
    })

    // Twig view should reappear
    await page.waitForSelector('.twig-view:not(.hidden)')
    const twigView = page.locator('.twig-view')
    await expect(twigView).not.toHaveClass(/hidden/)
  })

  test('pressing Escape in leaf view returns to twig view', async ({ page }) => {
    await page.evaluate(() => {
      const events = [
        {
          type: 'leaf_created',
          timestamp: new Date().toISOString(),
          leafId: 'leaf-esc-1',
          twigId: 'branch-0-twig-0',
          name: 'Escape Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sprout-esc-1',
          twigId: 'branch-0-twig-0',
          leafId: 'leaf-esc-1',
          title: 'Escape Test',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })
    await page.reload()
    await page.waitForSelector('.canvas')

    await navigateToTwig(page)
    await openLeafView(page)

    // Press Escape
    await page.keyboard.press('Escape')

    // Leaf view should close
    await page.waitForFunction(() => {
      const leafView = document.querySelector('.leaf-view')
      return leafView && !leafView.classList.contains('is-open')
    })

    // Twig view should reappear
    await page.waitForSelector('.twig-view:not(.hidden)')
    const twigView = page.locator('.twig-view')
    await expect(twigView).not.toHaveClass(/hidden/)
  })

  // ── LEAF DATA INTEGRITY ───────────────────────────────────────────────────

  test('leaf with multiple sprouts shows all in timeline', async ({ page }) => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const harvestDate = new Date(pastDate.getTime() + 15 * 24 * 60 * 60 * 1000)

    await page.evaluate(({ pastStr, harvestStr, nowStr }) => {
      const events = [
        {
          type: 'leaf_created',
          timestamp: pastStr,
          leafId: 'leaf-multi-1',
          twigId: 'branch-0-twig-0',
          name: 'Multi Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastStr,
          sproutId: 'sprout-multi-1',
          twigId: 'branch-0-twig-0',
          leafId: 'leaf-multi-1',
          title: 'First Chapter',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_harvested',
          timestamp: harvestStr,
          sproutId: 'sprout-multi-1',
          result: 4,
          reflection: 'Good progress',
          capacityGained: 0.5,
        },
        {
          type: 'sprout_planted',
          timestamp: nowStr,
          sproutId: 'sprout-multi-2',
          twigId: 'branch-0-twig-0',
          leafId: 'leaf-multi-1',
          title: 'Second Chapter',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    }, {
      pastStr: pastDate.toISOString(),
      harvestStr: harvestDate.toISOString(),
      nowStr: new Date().toISOString(),
    })

    await page.reload()
    await page.waitForSelector('.canvas')

    await navigateToTwig(page)

    // Click on sprout card title to open leaf view
    await openLeafView(page)

    // Both sprouts appear as planted entries
    const plantedEntries = page.locator('.log-entry-start')
    await expect(plantedEntries).toHaveCount(2)

    // Both sprout titles visible in timeline
    const logContent = await page.locator('.leaf-log').textContent()
    expect(logContent).toContain('First Chapter')
    expect(logContent).toContain('Second Chapter')

    // Completed sprout has a harvest/completion entry
    const completionEntry = page.locator('.log-entry-completion')
    await expect(completionEntry).toBeVisible()
    await expect(completionEntry).toContainText('Harvested')
    await expect(completionEntry).toContainText('4/5')
    await expect(completionEntry).toContainText('Good progress')

    // Data integrity: events in localStorage match what's displayed
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const plantEvents = events.filter(
      (e: any) => e.type === 'sprout_planted' && e.leafId === 'leaf-multi-1'
    )
    expect(plantEvents).toHaveLength(2)
    expect(plantEvents[0].title).toBe('First Chapter')
    expect(plantEvents[1].title).toBe('Second Chapter')

    const harvestEvents = events.filter(
      (e: any) => e.type === 'sprout_harvested' && e.sproutId === 'sprout-multi-1'
    )
    expect(harvestEvents).toHaveLength(1)
    expect(harvestEvents[0].result).toBe(4)
    expect(harvestEvents[0].reflection).toBe('Good progress')

    // Only one leaf_created event for this saga
    const leafEvents = events.filter(
      (e: any) => e.type === 'leaf_created' && e.leafId === 'leaf-multi-1'
    )
    expect(leafEvents).toHaveLength(1)
    expect(leafEvents[0].name).toBe('Multi Saga')
  })
})
