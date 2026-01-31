/**
 * E2E tests for navigation and view modes.
 */

import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')
  })

  test('starts in overview mode', async ({ page }) => {
    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-overview/)

    // All branches should be visible
    const branches = page.locator('.node.branch')
    await expect(branches).toHaveCount(8)
  })

  test('clicks branch to enter branch view', async ({ page }) => {
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-branch/)

    // Twigs should be visible
    const twigs = page.locator('.node.twig')
    await expect(twigs).toHaveCount(8)
  })

  test('clicks twig to enter twig view', async ({ page }) => {
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')

    await page.waitForSelector('.twig-view')
    const twigView = page.locator('.twig-view')
    await expect(twigView).toBeVisible()
  })

  test('escape returns from twig to branch view', async ({ page }) => {
    // Navigate to twig view
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    // Press escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Should be back in branch view
    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-branch/)

    const twigView = page.locator('.twig-view')
    await expect(twigView).not.toBeVisible()
  })

  test('escape returns from branch to overview', async ({ page }) => {
    // Navigate to branch view
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-branch/)

    // Press escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Should be back in overview
    await expect(canvas).toHaveClass(/is-overview/)
  })

  test('number key 1 jumps to branch 1 from overview', async ({ page }) => {
    await page.keyboard.press('1')
    await page.waitForTimeout(300)

    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-branch/)
  })

  test('arrow keys cycle branches in branch view', async ({ page }) => {
    // Enter branch view
    await page.keyboard.press('1')
    await page.waitForTimeout(300)

    // Get current branch label
    const initialLabel = await page.locator('.branch-label').textContent()

    // Press right arrow
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)

    // Label should change
    const newLabel = await page.locator('.branch-label').textContent()
    expect(newLabel).not.toBe(initialLabel)
  })

  test('hover on branch updates sidebar in overview', async ({ page }) => {
    // Hover over first branch
    const firstBranch = page.locator('.node.branch').first()
    await firstBranch.hover()
    await page.waitForTimeout(200)

    // Branch should have hover state
    await expect(firstBranch).toHaveClass(/is-hovered/)
  })

  test('trunk node is always visible in overview', async ({ page }) => {
    const trunk = page.locator('.node.trunk')
    await expect(trunk).toBeVisible()
  })

  test('double escape from twig returns to overview', async ({ page }) => {
    // Navigate to twig view
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    // Press escape twice
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Should be back in overview
    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-overview/)
  })

  test('clicking trunk returns to overview from branch view', async ({ page }) => {
    // Enter branch view
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    // Click trunk
    await page.click('.node.trunk')
    await page.waitForTimeout(300)

    // Should be back in overview
    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-overview/)
  })
})
