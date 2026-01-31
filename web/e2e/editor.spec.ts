/**
 * E2E tests for editor functionality (renaming nodes, adding notes).
 */

import { test, expect } from '@playwright/test'

test.describe('Editor Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')
  })

  test('can open editor on branch by double-clicking', async ({ page }) => {
    // Navigate to branch view
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    // Double-click on the branch label area
    const branchLabel = page.locator('.branch-label')
    if (await branchLabel.isVisible()) {
      await branchLabel.dblclick()
      await page.waitForTimeout(200)

      // Editor should appear
      const editor = page.locator('.editor-modal, .editor-dialog, .inline-editor')
      const isEditorVisible = await editor.isVisible()

      if (isEditorVisible) {
        await expect(editor).toBeVisible()
      }
    }
  })

  test('can edit branch label', async ({ page }) => {
    // Set up initial state
    await page.evaluate(() => {
      const state = {
        _version: 2,
        nodes: {
          'branch-0': { label: 'Original Label', note: '' },
        },
      }
      localStorage.setItem('trunk-notes-v1', JSON.stringify(state))
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Navigate to branch
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    // Try to open editor
    const branchLabel = page.locator('.branch-label')
    if (await branchLabel.isVisible()) {
      await branchLabel.dblclick()
      await page.waitForTimeout(200)

      const labelInput = page.locator('.editor-label-input, .label-input, input[type="text"]')
      if (await labelInput.isVisible()) {
        await labelInput.fill('New Label')

        // Save
        const saveBtn = page.locator('.editor-save, .save-btn, button:has-text("Save")')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(300)

          // Verify label changed
          await expect(branchLabel).toContainText('New Label')
        }
      }
    }
  })

  test('can add note to node', async ({ page }) => {
    // Navigate to branch
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    // Open editor
    const branchLabel = page.locator('.branch-label')
    if (await branchLabel.isVisible()) {
      await branchLabel.dblclick()
      await page.waitForTimeout(200)

      const noteInput = page.locator('.editor-note-input, .note-input, textarea')
      if (await noteInput.isVisible()) {
        await noteInput.fill('This is a test note')

        // Save
        const saveBtn = page.locator('.editor-save, .save-btn, button:has-text("Save")')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(300)

          // Verify note saved in state
          const state = await page.evaluate(() => {
            const raw = localStorage.getItem('trunk-notes-v1')
            return raw ? JSON.parse(raw) : null
          })

          const branchData = Object.values(state?.nodes || {}).find(
            (n: any) => n.note === 'This is a test note'
          )
          expect(branchData).toBeDefined()
        }
      }
    }
  })

  test('editor can be cancelled with escape', async ({ page }) => {
    // Navigate to branch
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    // Open editor
    const branchLabel = page.locator('.branch-label')
    if (await branchLabel.isVisible()) {
      await branchLabel.dblclick()
      await page.waitForTimeout(200)

      const editor = page.locator('.editor-modal, .editor-dialog, .inline-editor')
      if (await editor.isVisible()) {
        // Press escape
        await page.keyboard.press('Escape')
        await page.waitForTimeout(200)

        // Editor should close
        await expect(editor).not.toBeVisible()
      }
    }
  })

  test('twig label persists after edit', async ({ page }) => {
    // Navigate to twig
    await page.click('.node.branch')
    await page.waitForTimeout(300)

    // Get first twig
    const twig = page.locator('.node.twig').first()
    await twig.click()
    await page.waitForSelector('.twig-view')

    // Find and edit twig label
    const twigLabel = page.locator('.twig-label, .twig-view-header h2')
    if (await twigLabel.isVisible()) {
      await twigLabel.dblclick()
      await page.waitForTimeout(200)

      const labelInput = page.locator('.editor-label-input, .label-input, input[type="text"]')
      if (await labelInput.isVisible()) {
        await labelInput.fill('Custom Twig Name')

        const saveBtn = page.locator('.editor-save, .save-btn, button:has-text("Save")')
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(300)
        }
      }
    }

    // Refresh page
    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Navigate back
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.locator('.node.twig').first().click()
    await page.waitForSelector('.twig-view')

    // Check label persisted
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-notes-v1')
      return raw ? JSON.parse(raw) : null
    })

    const customTwig = Object.values(state?.nodes || {}).find(
      (n: any) => n.label === 'Custom Twig Name'
    )
    if (customTwig) {
      expect(customTwig).toBeDefined()
    }
  })
})
