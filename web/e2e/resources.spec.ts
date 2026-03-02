/**
 * E2E tests for resource management (soil, water, sun).
 */

import { test, expect, resetAppState } from './fixtures'

test.describe('Resource Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await resetAppState(page)
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('displays initial soil capacity of 10', async ({ page }) => {
    // Check header for soil meter
    const soilMeter = page.locator('.soil-meter')
    await expect(soilMeter).toBeVisible()

    // Soil value shows format like "10.00/10.00"
    const soilValue = page.locator('.soil-meter .resource-meter-value')
    await expect(soilValue).toContainText('10')
  })

  test('displays initial water capacity of 3', async ({ page }) => {
    // Water meter shows 3 filled circles
    const waterMeter = page.locator('.water-meter')
    await expect(waterMeter).toBeVisible()

    const filledCircles = page.locator('.water-circle.is-filled')
    await expect(filledCircles).toHaveCount(3)
  })

  test('displays initial sun capacity of 1', async ({ page }) => {
    // Sun meter shows 1 filled circle
    const sunMeter = page.locator('.sun-meter')
    await expect(sunMeter).toBeVisible()

    const filledCircle = page.locator('.sun-circle.is-filled')
    await expect(filledCircle).toHaveCount(1)
  })

  test('soil decreases when planting sprout', async ({ page }) => {
    // Navigate to twig view
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

    // Get initial soil value
    const soilValue = page.locator('.soil-meter .resource-meter-value')
    const initialText = await soilValue.textContent()
    const initialSoil = parseFloat(initialText?.split('/')[0] || '10')

    // Create a sprout
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Test Saga')
    await page.fill('.sprout-title-input', 'Test Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')

    // Wait for plant button to enable
    await page.waitForTimeout(200)
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Check soil decreased (2w fertile costs 2 soil)
    const finalText = await soilValue.textContent()
    const finalSoil = parseFloat(finalText?.split('/')[0] || '10')

    expect(finalSoil).toBeLessThan(initialSoil)
    expect(initialSoil - finalSoil).toBeCloseTo(2, 1)
  })

  test('water decreases after watering sprout', async ({ page }) => {
    // Set up a sprout via events
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const futureDate = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000)

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
          title: 'Needs Water',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
          endDate: futureDate.toISOString(),
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Check initial water (3 filled circles)
    const filledBefore = await page.locator('.water-circle.is-filled').count()
    expect(filledBefore).toBe(3)

    // Navigate to twig
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

    // Find and click water button
    const waterBtn = page.locator('.sprout-water-btn').first()
    if (await waterBtn.isVisible() && !(await waterBtn.isDisabled())) {
      await waterBtn.click()
      await page.waitForSelector('.water-dialog:not(.hidden)')

      // Fill in reflection and pour
      await page.fill('.water-dialog-journal', 'Made progress today')
      await page.click('.water-dialog-pour')
      await page.waitForTimeout(300)

      // Check water count decreased (2 filled circles now)
      const filledAfter = await page.locator('.water-circle.is-filled').count()
      expect(filledAfter).toBe(2)
    }
  })

  test('sun meter opens dialog and has shine functionality', async ({ page }) => {
    // Check initial sun (1 filled circle)
    const filledBefore = await page.locator('.sun-circle.is-filled').count()
    expect(filledBefore).toBe(1)

    // Click sun meter to open sun log dialog
    await page.click('.sun-meter')
    await page.waitForSelector('.sun-log-dialog:not(.hidden)')

    // Verify shine UI elements exist
    const shineJournal = page.locator('.sun-log-shine-journal')
    await expect(shineJournal).toBeVisible()

    const shineBtn = page.locator('.sun-log-shine-btn')
    await expect(shineBtn).toBeVisible()

    // Close dialog
    await page.click('.sun-log-dialog-close')
    await page.waitForTimeout(200)

    // Dialog should be hidden
    const dialog = page.locator('.sun-log-dialog')
    await expect(dialog).toHaveClass(/hidden/)
  })

  test('cannot plant when insufficient soil', async ({ page }) => {
    // Plant several sprouts to drain soil
    // Start with 10 soil, each 2w fertile costs 2

    // Navigate to twig view
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

    // Create 5 sprouts (2 * 5 = 10 soil)
    for (let i = 0; i < 5; i++) {
      await page.selectOption('.sprout-leaf-select', '__new__')
      await page.fill('.sprout-new-leaf-name', `Saga ${i}`)
      await page.fill('.sprout-title-input', `Sprout ${i}`)
      await page.click('.sprout-season-btn[data-season="2w"]')
      await page.click('.sprout-env-btn[data-env="fertile"]')
      await page.waitForTimeout(200)

      const plantBtn = page.locator('.sprout-set-btn')
      if (await plantBtn.isEnabled()) {
        await plantBtn.click()
        await page.waitForTimeout(300)
      }
    }

    // Try to create one more sprout
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Extra Saga')
    await page.fill('.sprout-title-input', 'Extra Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    await page.waitForTimeout(200)

    // Plant button should be disabled due to insufficient soil
    const plantBtn = page.locator('.sprout-set-btn')
    await expect(plantBtn).toBeDisabled()
  })
})
