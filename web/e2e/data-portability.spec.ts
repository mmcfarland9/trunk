/**
 * E2E tests for data persistence.
 */

import { test, expect, resetAppState } from './fixtures'

test.describe('Data Portability - Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await resetAppState(page)
    await page.reload()
    await page.waitForSelector('.canvas')
  })

  test('data persists across page refresh', async ({ page }) => {
    // Navigate to twig and create sprout
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

    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Persist Test')
    await page.fill('.sprout-title-input', 'Should Persist')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    await page.waitForTimeout(200)
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Refresh page
    await page.reload()
    await page.waitForSelector('.canvas')

    // Navigate back to twig
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

    // Verify sprout still exists
    const activeCard = page.locator('.sprout-active-card')
    await expect(activeCard).toContainText('Should Persist')
  })

  test('localStorage contains expected keys after interaction', async ({ page }) => {
    // Navigate and create something
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

    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Test')
    await page.fill('.sprout-title-input', 'Test Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    await page.waitForTimeout(200)
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Check localStorage keys - should have events
    const keys = await page.evaluate(() => Object.keys(localStorage))

    // App uses trunk-events-v1 for event-sourced state storage
    expect(keys).toContain('trunk-events-v1')
  })
})
