/**
 * E2E test to verify actual sprout lifecycle behavior in the browser.
 * This proves what states actually exist vs what's in documentation.
 */

import { test, expect } from '@playwright/test'

test.describe('Sprout Lifecycle - Actual Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')
  })

  test('creating a sprout goes directly to ACTIVE, not draft', async ({ page }) => {
    // Click on a branch to zoom in
    await page.click('.node.branch')
    await page.waitForTimeout(300) // Wait for animation

    // Click on a twig to open twig view
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

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

    // Verify it's NOT in any draft state - check localStorage
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-notes-v1')
      return raw ? JSON.parse(raw) : null
    })

    console.log('Stored state:', JSON.stringify(state, null, 2))

    // Find the sprout in state and verify its state is 'active'
    const nodes = state?.nodes || state
    let foundSprout = null
    for (const [nodeId, nodeData] of Object.entries(nodes)) {
      const nd = nodeData as any
      if (nd.sprouts) {
        foundSprout = nd.sprouts.find((s: any) => s.title === 'Test Sprout')
        if (foundSprout) break
      }
    }

    expect(foundSprout).not.toBeNull()
    expect(foundSprout.state).toBe('active') // NOT 'draft'!

    console.log('Sprout state after creation:', foundSprout.state)
  })

  test('harvesting with result 1 sets state to COMPLETED (no failed state)', async ({ page }) => {
    // Set up a sprout that's ready to harvest via localStorage
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      const endDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // Yesterday

      const state = {
        _version: 2,
        nodes: {
          'branch-0-twig-0': {
            label: 'Test Twig',
            note: '',
            sprouts: [{
              id: 'test-sprout-1',
              title: 'Ready to Harvest',
              season: '2w',
              environment: 'fertile',
              state: 'active',
              soilCost: 2,
              createdAt: pastDate.toISOString(),
              activatedAt: pastDate.toISOString(),
              endDate: endDate.toISOString(),
              leafId: 'test-leaf-1',
            }],
            leaves: [{
              id: 'test-leaf-1',
              name: 'Test Saga',
              createdAt: pastDate.toISOString(),
            }],
          },
        },
      }
      localStorage.setItem('trunk-notes-v1', JSON.stringify(state))
    })

    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Navigate to the twig
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

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

    // Check the stored state
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-notes-v1')
      return raw ? JSON.parse(raw) : null
    })

    const nodes = state?.nodes || state
    const twigData = nodes['branch-0-twig-0']
    const harvestedSprout = twigData?.sprouts?.find((s: any) => s.id === 'test-sprout-1')

    console.log('Sprout after harvest with result 1:', harvestedSprout)

    expect(harvestedSprout).not.toBeNull()
    expect(harvestedSprout.result).toBe(1)
    // Key assertion: even result 1 is 'completed', not 'failed'
    // "Showing up counts" - all harvests are completions
    expect(harvestedSprout.state).toBe('completed')
    console.log('STATE AFTER HARVEST WITH RESULT 1:', harvestedSprout.state)
  })

  test('harvesting with result 5 sets state to COMPLETED', async ({ page }) => {
    // Set up a sprout that's ready to harvest
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      const endDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)

      const state = {
        _version: 2,
        nodes: {
          'branch-0-twig-0': {
            label: 'Test Twig',
            note: '',
            sprouts: [{
              id: 'test-sprout-2',
              title: 'Ready to Harvest High',
              season: '2w',
              environment: 'fertile',
              state: 'active',
              soilCost: 2,
              createdAt: pastDate.toISOString(),
              activatedAt: pastDate.toISOString(),
              endDate: endDate.toISOString(),
              leafId: 'test-leaf-2',
            }],
            leaves: [{
              id: 'test-leaf-2',
              name: 'Test Saga 2',
              createdAt: pastDate.toISOString(),
            }],
          },
        },
      }
      localStorage.setItem('trunk-notes-v1', JSON.stringify(state))
    })

    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Navigate to the twig
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

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

    // Check the stored state
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-notes-v1')
      return raw ? JSON.parse(raw) : null
    })

    const nodes = state?.nodes || state
    const twigData = nodes['branch-0-twig-0']
    const harvestedSprout = twigData?.sprouts?.find((s: any) => s.id === 'test-sprout-2')

    console.log('Sprout after harvest with result 5:', harvestedSprout)

    expect(harvestedSprout).not.toBeNull()
    expect(harvestedSprout.result).toBe(5)
    expect(harvestedSprout.state).toBe('completed')
    console.log('STATE AFTER HARVEST WITH RESULT 5:', harvestedSprout.state)
  })
})
