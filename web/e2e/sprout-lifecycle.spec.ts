/**
 * E2E test to verify actual sprout lifecycle behavior in the browser.
 * This proves what states actually exist vs what's in documentation.
 */

import { test, expect, resetAppState } from './fixtures'

test.describe('Sprout Lifecycle - Actual Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await resetAppState(page)
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('creating a sprout goes directly to ACTIVE, not draft', async ({ page }) => {
    // Click on a branch to zoom in
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })

    // Click on a twig to open twig view (use JS click to bypass viewport check)
    await page.evaluate(() => {
      const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
      twig?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    // Take screenshot of empty twig view
    await page.screenshot({ path: 'e2e/screenshots/01-empty-twig-view.png' })

    // Fill out the sprout form
    // First, create a new leaf (required)
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Test Saga')

    // Fill sprout title
    await page.fill('.sprout-title-input', 'Test Sprout')

    // Select season (2w)
    await page.click('.sprout-season-btn[data-season="2w"]')

    // Select environment (fertile)
    await page.click('.sprout-env-btn[data-env="fertile"]')

    // Take screenshot of filled form
    await page.screenshot({ path: 'e2e/screenshots/02-form-filled.png' })

    // Click Plant button
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Take screenshot after planting
    await page.screenshot({ path: 'e2e/screenshots/03-after-planting.png' })

    // Verify the sprout appears in "Growing" column (active), not in drafts
    const activeCard = page.locator('.sprout-active-card')
    await expect(activeCard).toBeVisible()
    await expect(activeCard).toContainText('Test Sprout')

    // Verify event-sourced state: a sprout_planted event should exist
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const plantedEvent = events.find((e: any) => e.type === 'sprout_planted')
    expect(plantedEvent).toBeDefined()
    expect(plantedEvent.title).toBe('Test Sprout')
    expect(plantedEvent.season).toBe('2w')
    expect(plantedEvent.environment).toBe('fertile')

    // Active state is implied by sprout_planted without a subsequent
    // sprout_harvested or sprout_uprooted event
    const terminalEvent = events.find(
      (e: any) =>
        (e.type === 'sprout_harvested' || e.type === 'sprout_uprooted') &&
        e.sproutId === plantedEvent.sproutId
    )
    expect(terminalEvent).toBeUndefined()

    console.log('Sprout planted event:', plantedEvent)
  })

  test('harvesting with result 1 sets state to COMPLETED (no failed state)', async ({ page }) => {
    // Set up a sprout that's ready to harvest via event-sourced localStorage
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf-1',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout-1',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf-1',
          title: 'Ready to Harvest',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Navigate to the twig
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

    // Screenshot showing ready to harvest
    await page.screenshot({ path: 'e2e/screenshots/04-ready-to-harvest.png' })

    // Verify sprout shows as ready
    const readyCard = page.locator('.sprout-active-card.is-ready')
    await expect(readyCard).toBeVisible()

    // Click harvest button
    await page.click('.sprout-harvest-btn')
    await page.waitForSelector('.harvest-dialog')

    // Screenshot of harvest dialog
    await page.screenshot({ path: 'e2e/screenshots/05-harvest-dialog.png' })

    // Set result to 1 (lowest)
    await page.fill('.harvest-dialog-slider', '1')
    // Trigger change event
    await page.evaluate(() => {
      const slider = document.querySelector('.harvest-dialog-slider') as HTMLInputElement
      slider.value = '1'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await page.waitForTimeout(100)
    await page.screenshot({ path: 'e2e/screenshots/06-result-set-to-1.png' })

    // Click save
    await page.click('.harvest-dialog-save')
    await page.waitForTimeout(300)

    // Screenshot after harvest
    await page.screenshot({ path: 'e2e/screenshots/07-after-harvest-result-1.png' })

    // Check the event-sourced state
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const harvestEvent = events.find(
      (e: any) => e.type === 'sprout_harvested' && e.sproutId === 'test-sprout-1'
    )

    console.log('Harvest event with result 1:', harvestEvent)

    expect(harvestEvent).toBeDefined()
    expect(harvestEvent.result).toBe(1)
    // Key assertion: even result 1 produces a sprout_harvested event, not a "failed" event
    // "Showing up counts" - all harvests are completions
    expect(harvestEvent.type).toBe('sprout_harvested')
    console.log('EVENT TYPE AFTER HARVEST WITH RESULT 1:', harvestEvent.type)
  })

  test('harvesting with result 5 sets state to COMPLETED', async ({ page }) => {
    // Set up a sprout that's ready to harvest via event-sourced localStorage
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf-2',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga 2',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout-2',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf-2',
          title: 'Ready to Harvest High',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Navigate to the twig
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

    // Click harvest button
    await page.click('.sprout-harvest-btn')
    await page.waitForSelector('.harvest-dialog')

    // Set result to 5 (highest)
    await page.evaluate(() => {
      const slider = document.querySelector('.harvest-dialog-slider') as HTMLInputElement
      slider.value = '5'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await page.waitForTimeout(100)

    // Click save
    await page.click('.harvest-dialog-save')
    await page.waitForTimeout(300)

    // Check the event-sourced state
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const harvestEvent = events.find(
      (e: any) => e.type === 'sprout_harvested' && e.sproutId === 'test-sprout-2'
    )

    console.log('Harvest event with result 5:', harvestEvent)

    expect(harvestEvent).toBeDefined()
    expect(harvestEvent.result).toBe(5)
    expect(harvestEvent.type).toBe('sprout_harvested')
    console.log('EVENT TYPE AFTER HARVEST WITH RESULT 5:', harvestEvent.type)
  })
})
