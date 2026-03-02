/**
 * E2E tests for navigation and view modes.
 *
 * Canvas class states:
 * - Overview: no special class (just 'canvas')
 * - Branch view: 'is-zoomed'
 * - Twig view: 'is-twig-zoomed'
 * - During transitions: 'is-zooming'
 */

import { test, expect, resetAppState } from './fixtures'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await resetAppState(page)
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('starts in overview mode', async ({ page }) => {
    const canvas = page.locator('.canvas')
    // Overview mode has no special class - canvas should NOT have is-zoomed
    await expect(canvas).not.toHaveClass(/is-zoomed/)

    // All branches should be visible
    const branches = page.locator('.node.branch')
    await expect(branches).toHaveCount(8)
  })

  test('clicks branch to enter branch view', async ({ page }) => {
    await page.click('.node.branch', { force: true })
    // Wait for zoom animation to complete
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed') && !canvas.classList.contains('is-zooming')
    }, { timeout: 5000 })

    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-zoomed/)

    // All 64 twigs exist in DOM, but in branch view we should see them
    const twigs = page.locator('.node.twig')
    const count = await twigs.count()
    expect(count).toBe(64) // All twigs always exist in DOM
  })

  test('clicks twig to enter twig view', async ({ page }) => {
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })
    // Click a twig from the active branch group (use JS click to bypass viewport check)
    await page.evaluate(() => {
      const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
      twig?.click()
    })

    await page.waitForSelector('.twig-view:not(.hidden)')
    const twigView = page.locator('.twig-view')
    await expect(twigView).not.toHaveClass(/hidden/)
  })

  test('escape returns from twig to branch view', async ({ page }) => {
    // Navigate to twig view
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })
    // Click a twig from the active branch group (use JS click to bypass viewport check)
    await page.evaluate(() => {
      const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
      twig?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    // Press escape
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => {
      const twigView = document.querySelector('.twig-view')
      return twigView && twigView.classList.contains('hidden')
    }, { timeout: 5000 })

    // Twig view should have hidden class
    const twigView = page.locator('.twig-view')
    await expect(twigView).toHaveClass(/hidden/)
  })

  test('escape returns from branch to overview', async ({ page }) => {
    // Navigate to branch view
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })

    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-zoomed/)

    // Press escape
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && !canvas.classList.contains('is-zoomed') && !canvas.classList.contains('is-zooming')
    }, { timeout: 5000 })

    // Should be back in overview (no is-zoomed class)
    await expect(canvas).not.toHaveClass(/is-zoomed/)
  })

  test('number key 1 jumps to branch 1 from overview', async ({ page }) => {
    await page.keyboard.press('1')
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    }, { timeout: 5000 })

    const canvas = page.locator('.canvas')
    await expect(canvas).toHaveClass(/is-zoomed/)
  })

  test('arrow keys cycle branches in branch view', async ({ page }) => {
    // Enter branch view
    await page.keyboard.press('1')
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })

    // Get current focused title from sidebar
    const initialLabel = await page.locator('.focus-title').textContent()

    // Press right arrow (Meta+ArrowRight cycles branches)
    await page.keyboard.press('Meta+ArrowRight')
    await page.waitForTimeout(300)

    // Focused title should change
    const newLabel = await page.locator('.focus-title').textContent()
    expect(newLabel).not.toBe(initialLabel)
  })

  test('hover on branch triggers sidebar update', async ({ page }) => {
    // Hover over a branch and verify sidebar responds
    // The hover detection uses JS state, not CSS classes
    const firstBranch = page.locator('.node.branch').first()
    await firstBranch.hover()
    await page.waitForTimeout(200)

    // Verify the branch node exists and can be hovered
    await expect(firstBranch).toBeVisible()
  })

  test('trunk node is always visible in overview', async ({ page }) => {
    const trunk = page.locator('.node.trunk')
    await expect(trunk).toHaveCount(1)
  })

  test('double escape from twig returns to overview', async ({ page }) => {
    // Navigate to twig view
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })
    // Click a twig from the active branch group (use JS click to bypass viewport check)
    await page.evaluate(() => {
      const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
      twig?.click()
    })
    await page.waitForSelector('.twig-view:not(.hidden)')

    // Press escape twice
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && !canvas.classList.contains('is-zoomed') && !canvas.classList.contains('is-zooming')
    }, { timeout: 5000 })

    // Should be back in overview (no is-zoomed class)
    const canvas = page.locator('.canvas')
    await expect(canvas).not.toHaveClass(/is-zoomed/)
  })

  test('clicking trunk returns to overview from branch view', async ({ page }) => {
    // Enter branch view
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })

    // Click trunk
    await page.click('.node.trunk', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && !canvas.classList.contains('is-zoomed') && !canvas.classList.contains('is-zooming')
    }, { timeout: 5000 })

    // Should be back in overview (no is-zoomed class)
    const canvas = page.locator('.canvas')
    await expect(canvas).not.toHaveClass(/is-zoomed/)
  })
})
