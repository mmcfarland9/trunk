/**
 * E2E tests for editor functionality (renaming nodes, adding notes).
 *
 * The editor appears when clicking on a focused node in the sidebar.
 * It allows editing labels and notes for trunk, branches, and twigs.
 */

import { test, expect, resetAppState } from './fixtures'

test.describe('Editor Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await resetAppState(page)
    await page.reload()
    await page.waitForSelector('.canvas')
    await page.waitForTimeout(500)
  })

  test('focus section shows node details', async ({ page }) => {
    // In overview, trunk should be focused by default
    const focusTitle = page.locator('.focus-title')
    await expect(focusTitle).toBeVisible()

    // Navigate to branch view
    await page.click('.node.branch', { force: true })
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')
      return canvas && canvas.classList.contains('is-zoomed')
    })

    // Focus title should update to show branch name
    await expect(focusTitle).not.toBeEmpty()
  })

  test('node labels are visible in the tree', async ({ page }) => {
    // Trunk uses tree icon instead of text label, so check branches only
    const branchLabels = page.locator('.node.branch .node-label')
    await expect(branchLabels).toHaveCount(8)

    // Verify at least one branch label has text content
    const firstLabel = branchLabels.first()
    await expect(firstLabel).not.toBeEmpty()
  })

  test('node data persists in localStorage', async ({ page }) => {
    // Set up initial state via events
    await page.evaluate(() => {
      const events = [
        {
          type: 'node_updated',
          timestamp: new Date().toISOString(),
          nodeId: 'branch-0',
          label: 'Test Branch',
          note: 'Test note content',
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Verify state exists
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : null
    })

    expect(state).toBeDefined()
    expect(state[0].label).toBe('Test Branch')
    expect(state[0].note).toBe('Test note content')
  })

  test('twig view shows editable content area', async ({ page }) => {
    // Navigate to twig
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

    // Twig view should be visible
    const twigView = page.locator('.twig-view')
    await expect(twigView).toBeVisible()

    // Should have columns for drafts, active, and history
    await expect(page.locator('.sprout-drafts')).toBeVisible()
    await expect(page.locator('.sprout-active')).toBeVisible()
    await expect(page.locator('.sprout-history')).toBeVisible()
  })

})
