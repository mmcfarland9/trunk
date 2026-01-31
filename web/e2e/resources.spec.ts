/**
 * E2E tests for resource management (soil, water, sun).
 */

import { test, expect } from '@playwright/test'

test.describe('Resource Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')
  })

  test('displays initial soil capacity of 10', async ({ page }) => {
    // Check sidebar for soil display
    const soilMeter = page.locator('.soil-meter')
    await expect(soilMeter).toBeVisible()
    await expect(soilMeter).toContainText('10')
  })

  test('displays initial water capacity of 3', async ({ page }) => {
    const waterMeter = page.locator('.water-meter')
    await expect(waterMeter).toBeVisible()
    await expect(waterMeter).toContainText('3')
  })

  test('displays initial sun capacity of 1', async ({ page }) => {
    const sunMeter = page.locator('.sun-meter')
    await expect(sunMeter).toBeVisible()
    await expect(sunMeter).toContainText('1')
  })

  test('soil decreases when planting sprout', async ({ page }) => {
    // Navigate to twig view
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    // Record initial soil
    const initialSoil = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-resources-v1')
      if (!raw) return 10
      const resources = JSON.parse(raw)
      return resources.soilAvailable ?? 10
    })

    // Create a sprout
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Test Saga')
    await page.fill('.sprout-title-input', 'Test Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Check soil decreased
    const finalSoil = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-resources-v1')
      if (!raw) return 10
      const resources = JSON.parse(raw)
      return resources.soilAvailable ?? 10
    })

    // 2w fertile costs 2 soil
    expect(finalSoil).toBeLessThan(initialSoil)
    expect(initialSoil - finalSoil).toBe(2)
  })

  test('water decreases after watering sprout', async ({ page }) => {
    // Set up a sprout in state
    await page.evaluate(() => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const state = {
        _version: 2,
        nodes: {
          'branch-0-twig-0': {
            label: 'Test Twig',
            note: '',
            sprouts: [{
              id: 'test-sprout-1',
              title: 'Needs Water',
              season: '2w',
              environment: 'fertile',
              state: 'active',
              soilCost: 2,
              createdAt: pastDate.toISOString(),
              activatedAt: pastDate.toISOString(),
              endDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
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

    // Navigate to twig
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    // Find and click water button
    const waterBtn = page.locator('.sprout-water-btn')
    if (await waterBtn.isVisible()) {
      await waterBtn.click()
      await page.waitForSelector('.water-dialog')

      // Fill in reflection
      await page.fill('.water-dialog-textarea', 'Made progress today')
      await page.click('.water-dialog-save')
      await page.waitForTimeout(300)

      // Check water count decreased
      const waterMeter = page.locator('.water-meter')
      await expect(waterMeter).toContainText('2')
    }
  })

  test('sun decreases after shining on twig', async ({ page }) => {
    // Navigate to twig view
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    // Find and click shine button
    const shineBtn = page.locator('.shine-btn')
    if (await shineBtn.isVisible()) {
      await shineBtn.click()
      await page.waitForSelector('.shine-dialog')

      // Fill in reflection
      await page.fill('.shine-dialog-textarea', 'Reflecting on this week')
      await page.click('.shine-dialog-save')
      await page.waitForTimeout(300)

      // Check sun count decreased
      const sunMeter = page.locator('.sun-meter')
      await expect(sunMeter).toContainText('0')
    }
  })

  test('cannot plant when insufficient soil', async ({ page }) => {
    // Set up state with very low soil
    await page.evaluate(() => {
      const resources = {
        soilAvailable: 1,
        soilCapacity: 10,
        waterAvailable: 3,
        sunAvailable: 1,
      }
      localStorage.setItem('trunk-resources-v1', JSON.stringify(resources))
    })

    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Navigate to twig view
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    // Try to create a sprout that costs more than available
    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Test Saga')
    await page.fill('.sprout-title-input', 'Expensive Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]') // 2 soil cost

    // Plant button should be disabled or show error
    const plantBtn = page.locator('.sprout-set-btn')
    const isDisabled = await plantBtn.isDisabled()

    // Either button is disabled OR clicking shows no new sprout
    if (!isDisabled) {
      await plantBtn.click()
      await page.waitForTimeout(300)
      // Sprout should not appear due to insufficient soil
      const activeCard = page.locator('.sprout-active-card')
      const count = await activeCard.count()
      expect(count).toBe(0)
    }
  })
})
