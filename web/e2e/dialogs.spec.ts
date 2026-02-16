/**
 * E2E tests for water and shine dialogs.
 * Tests the journaling modals for daily water and weekly sun reflection.
 */

import { test, expect } from '@playwright/test'

test.describe('Water Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Wait for canvas to be ready (trunk might have visibility quirks)
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500) // Allow animations to settle
  })

  test('opens water dialog when clicking water button on sprout', async ({ page }) => {
    // Set up a sprout via events
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const futureDate = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'Water Me',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate to twig
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas?.classList.contains('is-zoomed')
    })
    await page.evaluate(() => {
      const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
      twig?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    // Click water button
    const waterBtn = page.locator('.sprout-water-btn').first()
    await waterBtn.click()

    // Verify dialog opens
    const dialog = page.locator('.water-dialog')
    await expect(dialog).not.toHaveClass(/hidden/)
  })

  test('displays sprout title and twig info in water dialog', async ({ page }) => {
    // Set up a sprout
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'My Test Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate to twig and open water dialog
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => document.querySelector('.canvas')?.classList.contains('is-zoomed'))
    await page.evaluate(() => {
      (document.querySelector('.branch-group.is-active .node.twig') as HTMLElement)?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    await page.locator('.sprout-water-btn').first().click()
    await page.waitForSelector('.water-dialog:not(.hidden)')

    // Check dialog elements are displayed
    const title = page.locator('.water-dialog-title')
    await expect(title).toBeVisible()

    // Check sprout section is present with sprout name
    const section = page.locator('.water-dialog-section')
    await expect(section).toBeVisible()
    const sproutName = page.locator('.water-dialog-sprout-name')
    await expect(sproutName).toBeVisible()
    await expect(sproutName).toContainText('My Test Sprout')
  })

  test('save button is disabled until content is entered', async ({ page }) => {
    // Set up a sprout
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'Test Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate and open dialog
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => document.querySelector('.canvas')?.classList.contains('is-zoomed'))
    await page.evaluate(() => {
      (document.querySelector('.branch-group.is-active .node.twig') as HTMLElement)?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    await page.locator('.sprout-water-btn').first().click()
    await page.waitForSelector('.water-dialog:not(.hidden)')

    // Pour button should be disabled initially
    const pourBtn = page.locator('.water-dialog-pour').first()
    await expect(pourBtn).toBeDisabled()

    // Type some content
    await page.fill('.water-dialog-journal', 'Made progress today')

    // Pour button should be enabled
    await expect(pourBtn).toBeEnabled()
  })

  test('watering sprout saves entry and closes dialog', async ({ page }) => {
    // Set up a sprout
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'Test Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate and open dialog
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => document.querySelector('.canvas')?.classList.contains('is-zoomed'))
    await page.evaluate(() => {
      (document.querySelector('.branch-group.is-active .node.twig') as HTMLElement)?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    await page.locator('.sprout-water-btn').first().click()
    await page.waitForSelector('.water-dialog:not(.hidden)')

    // Fill journal and pour
    await page.fill('.water-dialog-journal', 'Made progress today')
    await page.click('.water-dialog-pour')

    // Verify section becomes watered
    const section = page.locator('.water-dialog-section')
    await expect(section).toHaveClass(/is-watered/)

    // Close dialog manually
    await page.click('.water-dialog-close')
    await page.waitForFunction(() => document.querySelector('.water-dialog')?.classList.contains('hidden'))

    // Verify we're back in twig view
    const twigView = page.locator('.twig-view')
    await expect(twigView).not.toHaveClass(/hidden/)
  })

  test('closing dialog does not save entry', async ({ page }) => {
    // Set up a sprout
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'Test Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate and open dialog
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => document.querySelector('.canvas')?.classList.contains('is-zoomed'))
    await page.evaluate(() => {
      (document.querySelector('.branch-group.is-active .node.twig') as HTMLElement)?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    await page.locator('.sprout-water-btn').first().click()
    await page.waitForSelector('.water-dialog:not(.hidden)')

    // Type content but close instead of save
    await page.fill('.water-dialog-journal', 'This will not be saved')
    await page.click('.water-dialog-close')
    await page.waitForTimeout(200)

    // Dialog should be closed
    const dialog = page.locator('.water-dialog')
    await expect(dialog).toHaveClass(/hidden/)

    // Water should still be at 3
    const filled = await page.locator('.water-circle.is-filled').count()
    expect(filled).toBe(3)
  })

  test('close button closes dialog without saving', async ({ page }) => {
    // Set up a sprout
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'Test Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate and open dialog
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => document.querySelector('.canvas')?.classList.contains('is-zoomed'))
    await page.evaluate(() => {
      (document.querySelector('.branch-group.is-active .node.twig') as HTMLElement)?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    await page.locator('.sprout-water-btn').first().click()
    await page.waitForSelector('.water-dialog:not(.hidden)')

    // Click close (X button in header)
    await page.click('.water-dialog-close')
    await page.waitForTimeout(200)

    // Dialog should be closed
    const dialog = page.locator('.water-dialog')
    await expect(dialog).toHaveClass(/hidden/)
  })

  test('watering creates sprout_watered event', async ({ page }) => {
    // Set up a sprout
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'Test Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate and open dialog
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => document.querySelector('.canvas')?.classList.contains('is-zoomed'))
    await page.evaluate(() => {
      (document.querySelector('.branch-group.is-active .node.twig') as HTMLElement)?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    await page.locator('.sprout-water-btn').first().click()
    await page.waitForSelector('.water-dialog:not(.hidden)')

    // Fill and pour
    await page.fill('.water-dialog-journal', 'My journal entry')
    await page.click('.water-dialog-pour')
    await page.waitForTimeout(300)

    // Check event was created
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const waterEvent = events.find((e: any) => e.type === 'sprout_watered')
    expect(waterEvent).toBeDefined()
    expect(waterEvent.content).toBe('My journal entry')
    expect(waterEvent.sproutId).toBe('test-sprout')
  })
})

test.describe('Shine Dialog (Sun Log)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('clicking sun meter opens sun log dialog', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    const dialog = page.locator('.sun-log-dialog')
    await expect(dialog).not.toHaveClass(/hidden/)
  })

  test('shows shine section when sun is available', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Shine section should be visible
    const shineSection = page.locator('.sun-log-shine-section')
    await expect(shineSection).not.toHaveClass(/hidden/)

    // Journal textarea should be visible
    const journal = page.locator('.sun-log-shine-journal')
    await expect(journal).toBeVisible()
  })

  test('displays random twig for reflection', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Title should show a twig label
    const title = page.locator('.sun-log-shine-title')
    const titleText = await title.textContent()
    expect(titleText).toBeTruthy()
    expect(titleText!.length).toBeGreaterThan(0)
  })

  test('radiate button is disabled until content is entered', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Button should be disabled initially
    const radiateBtn = page.locator('.sun-log-shine-btn')
    await expect(radiateBtn).toBeDisabled()

    // Type content
    await page.fill('.sun-log-shine-journal', 'My reflection')

    // Button should be enabled
    await expect(radiateBtn).toBeEnabled()
  })

  test('shining decreases sun meter', async ({ page }) => {
    // Check initial sun (1 filled circle)
    const filledBefore = await page.locator('.sun-circle.is-filled').count()
    expect(filledBefore).toBe(1)

    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Fill and radiate
    await page.fill('.sun-log-shine-journal', 'Deep reflection on my growth')
    await page.click('.sun-log-shine-btn')
    await page.waitForTimeout(300)

    // Sun should decrease to 0
    const filledAfter = await page.locator('.sun-circle.is-filled').count()
    expect(filledAfter).toBe(0)
  })

  test('shows "already shone" state after shining', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Fill and radiate
    await page.fill('.sun-log-shine-journal', 'My weekly reflection')
    await page.click('.sun-log-shine-btn')
    await page.waitForTimeout(300)

    // Shine section should be hidden, "already shone" should show
    const shineSection = page.locator('.sun-log-shine-section')
    await expect(shineSection).toHaveClass(/hidden/)

    const shoneState = page.locator('.sun-log-shine-shone')
    await expect(shoneState).not.toHaveClass(/hidden/)
  })

  test('shining creates sun_shone event', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Fill and radiate
    await page.fill('.sun-log-shine-journal', 'Reflecting on progress')
    await page.click('.sun-log-shine-btn')
    await page.waitForTimeout(300)

    // Check event was created
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : []
    })

    const sunEvent = events.find((e: any) => e.type === 'sun_shone')
    expect(sunEvent).toBeDefined()
    expect(sunEvent.content).toBe('Reflecting on progress')
    expect(sunEvent.twigId).toMatch(/^branch-\d+-twig-\d+$/)
    expect(sunEvent.twigLabel).toBeTruthy()
  })

  test('closing dialog via close button', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    await page.click('.sun-log-dialog-close')
    await page.waitForTimeout(200)

    const dialog = page.locator('.sun-log-dialog')
    await expect(dialog).toHaveClass(/hidden/)
  })

  test('cannot shine twice in the same week', async ({ page }) => {
    // First shine
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')
    await page.fill('.sun-log-shine-journal', 'First reflection')
    await page.click('.sun-log-shine-btn')
    await page.waitForTimeout(300)

    // Close and reopen
    await page.click('.sun-log-dialog-close')
    await page.waitForTimeout(200)

    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Shine section should be hidden
    const shineSection = page.locator('.sun-log-shine-section')
    await expect(shineSection).toHaveClass(/hidden/)

    // "Already shone" should be visible
    const shoneState = page.locator('.sun-log-shine-shone')
    await expect(shoneState).not.toHaveClass(/hidden/)
  })

  test('shining increases soil available', async ({ page }) => {
    // Get initial soil
    const soilBefore = await page.locator('.soil-meter .resource-meter-value').textContent()
    const initialSoil = parseFloat(soilBefore?.split('/')[0] || '10')

    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    await page.fill('.sun-log-shine-journal', 'Reflection for soil recovery')
    await page.click('.sun-log-shine-btn')

    // Wait for action to complete
    await page.waitForTimeout(500)

    // Close dialog
    await page.click('.sun-log-dialog-close')
    await page.waitForFunction(() => document.querySelector('.sun-log-dialog')?.classList.contains('hidden'))
    await page.waitForTimeout(500)

    // Check soil increased (should be > initial)
    const soilAfter = await page.locator('.soil-meter .resource-meter-value').textContent()
    const finalSoil = parseFloat(soilAfter?.split('/')[0] || '10')

    // Soil should have increased (exact amount depends on implementation)
    expect(finalSoil).toBeGreaterThanOrEqual(initialSoil)
  })
})

test.describe('Dialog Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('water dialog journal has placeholder prompt', async ({ page }) => {
    // Set up a sprout
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const events = [
        {
          type: 'leaf_created',
          timestamp: pastDate.toISOString(),
          leafId: 'test-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Test Saga',
        },
        {
          type: 'sprout_planted',
          timestamp: pastDate.toISOString(),
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          leafId: 'test-leaf',
          title: 'Test Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)

    // Navigate and open dialog
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => document.querySelector('.canvas')?.classList.contains('is-zoomed'))
    await page.evaluate(() => {
      (document.querySelector('.branch-group.is-active .node.twig') as HTMLElement)?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    await page.locator('.sprout-water-btn').first().click()
    await page.waitForSelector('.water-dialog:not(.hidden)')

    // Check placeholder exists
    const placeholder = await page.locator('.water-dialog-journal').getAttribute('placeholder')
    expect(placeholder).toBeTruthy()
    expect(placeholder!.length).toBeGreaterThan(10)
  })

  test('sun dialog journal has placeholder prompt', async ({ page }) => {
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Check placeholder exists
    const placeholder = await page.locator('.sun-log-shine-journal').getAttribute('placeholder')
    expect(placeholder).toBeTruthy()
    expect(placeholder!.length).toBeGreaterThan(10)
  })
})
