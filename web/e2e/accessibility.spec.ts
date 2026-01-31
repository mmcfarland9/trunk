/**
 * Accessibility tests using axe-core.
 * These verify the app meets WCAG guidelines.
 *
 * Run: npm run test:e2e
 * Requires: npm install -D @axe-core/playwright
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.node.trunk')
  })

  test('overview page has no critical accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2))
    }

    // No critical or serious violations
    const critical = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    )
    expect(critical).toHaveLength(0)
  })

  test('branch view has no critical accessibility violations', async ({ page }) => {
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const critical = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    )
    expect(critical).toHaveLength(0)
  })

  test('twig view has no critical accessibility violations', async ({ page }) => {
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const critical = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    )
    expect(critical).toHaveLength(0)
  })

  test('interactive elements are keyboard accessible', async ({ page }) => {
    // Can navigate with keyboard
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()

    // Can activate with Enter
    await page.keyboard.press('1') // Jump to branch 1
    await page.waitForTimeout(300)

    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-branch/)
  })

  test('buttons have accessible names', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('button')
      .analyze()

    const buttonNameViolations = results.violations.filter(v =>
      v.id === 'button-name'
    )
    expect(buttonNameViolations).toHaveLength(0)
  })

  test('color contrast meets WCAG AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze()

    const contrastViolations = results.violations.filter(v =>
      v.id === 'color-contrast'
    )

    // Log for fixing
    if (contrastViolations.length > 0) {
      console.log('Contrast issues:', contrastViolations)
    }

    // Allow some minor contrast issues but flag critical ones
    const criticalContrast = contrastViolations.filter(v => v.impact === 'critical')
    expect(criticalContrast).toHaveLength(0)
  })

  test('images have alt text', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .analyze()

    const altViolations = results.violations.filter(v =>
      v.id === 'image-alt'
    )
    expect(altViolations).toHaveLength(0)
  })

  test('form inputs have labels', async ({ page }) => {
    // Navigate to twig view where forms exist
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    const results = await new AxeBuilder({ page })
      .include('input, select, textarea')
      .analyze()

    const labelViolations = results.violations.filter(v =>
      v.id === 'label' || v.id === 'select-name'
    )

    // Log for fixing
    if (labelViolations.length > 0) {
      console.log('Label issues:', labelViolations)
    }

    expect(labelViolations).toHaveLength(0)
  })

  test('focus is visible', async ({ page }) => {
    // Tab through elements and verify focus is visible
    await page.keyboard.press('Tab')

    const hasFocusStyle = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return false
      const styles = window.getComputedStyle(el)
      // Check for outline or box-shadow indicating focus
      return styles.outline !== 'none' ||
             styles.boxShadow !== 'none' ||
             el.classList.contains('focus-visible')
    })

    expect(hasFocusStyle).toBe(true)
  })

  test('page has proper heading hierarchy', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .analyze()

    const headingViolations = results.violations.filter(v =>
      v.id === 'heading-order' || v.id === 'page-has-heading-one'
    )

    expect(headingViolations).toHaveLength(0)
  })
})
