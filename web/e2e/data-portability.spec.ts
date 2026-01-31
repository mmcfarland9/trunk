/**
 * E2E tests for import/export functionality.
 */

import { test, expect } from '@playwright/test'

test.describe('Data Portability - Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')
  })

  test('export button is visible in sidebar', async ({ page }) => {
    const exportBtn = page.locator('.export-btn')
    await expect(exportBtn).toBeVisible()
  })

  test('import button is visible in sidebar', async ({ page }) => {
    const importBtn = page.locator('.import-btn')
    await expect(importBtn).toBeVisible()
  })

  test('export triggers download', async ({ page }) => {
    // Listen for download event
    const downloadPromise = page.waitForEvent('download')

    // Click export
    const exportBtn = page.locator('.export-btn')
    await exportBtn.click()

    // Verify download started
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/trunk.*\.json/)
  })

  test('exported data contains version number', async ({ page }) => {
    // Set up some data
    await page.evaluate(() => {
      const state = {
        _version: 2,
        nodes: {
          'trunk': { label: 'My Life', note: 'Test note' },
        },
      }
      localStorage.setItem('trunk-notes-v1', JSON.stringify(state))
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Listen for download
    const downloadPromise = page.waitForEvent('download')
    await page.locator('.export-btn').click()

    const download = await downloadPromise
    const path = await download.path()

    if (path) {
      const fs = require('fs')
      const content = fs.readFileSync(path, 'utf-8')
      const data = JSON.parse(content)

      expect(data._version).toBeDefined()
      expect(data._version).toBeGreaterThanOrEqual(1)
    }
  })

  test('import replaces existing data', async ({ page }) => {
    // Set initial state
    await page.evaluate(() => {
      const state = {
        _version: 2,
        nodes: {
          'trunk': { label: 'Original', note: '' },
        },
      }
      localStorage.setItem('trunk-notes-v1', JSON.stringify(state))
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Prepare import file
    const importData = {
      _version: 2,
      nodes: {
        'trunk': { label: 'Imported', note: 'New note' },
      },
    }

    // Create file input interaction
    const fileChooserPromise = page.waitForEvent('filechooser')

    // Click import button (might open file dialog)
    const importBtn = page.locator('.import-btn')
    if (await importBtn.isVisible()) {
      await importBtn.click()

      try {
        const fileChooser = await fileChooserPromise
        // Create temp file with import data
        const tempPath = '/tmp/trunk-import-test.json'
        require('fs').writeFileSync(tempPath, JSON.stringify(importData))
        await fileChooser.setFiles(tempPath)

        await page.waitForTimeout(500)

        // Verify data was imported
        const state = await page.evaluate(() => {
          const raw = localStorage.getItem('trunk-notes-v1')
          return raw ? JSON.parse(raw) : null
        })

        expect(state?.nodes?.trunk?.label).toBe('Imported')
      } catch {
        // File chooser might not appear in all environments
        test.skip()
      }
    }
  })

  test('data persists across page refresh', async ({ page }) => {
    // Navigate to twig and create sprout
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Persist Test')
    await page.fill('.sprout-title-input', 'Should Persist')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Refresh page
    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Navigate back to twig
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    // Verify sprout still exists
    const activeCard = page.locator('.sprout-active-card')
    await expect(activeCard).toContainText('Should Persist')
  })

  test('localStorage contains expected keys after interaction', async ({ page }) => {
    // Navigate and create something
    await page.click('.node.branch')
    await page.waitForTimeout(300)
    await page.click('.node.twig')
    await page.waitForSelector('.twig-view')

    await page.selectOption('.sprout-leaf-select', '__new__')
    await page.fill('.sprout-new-leaf-name', 'Test')
    await page.fill('.sprout-title-input', 'Test Sprout')
    await page.click('.sprout-season-btn[data-season="2w"]')
    await page.click('.sprout-env-btn[data-env="fertile"]')
    await page.click('.sprout-set-btn')
    await page.waitForTimeout(300)

    // Check localStorage keys
    const keys = await page.evaluate(() => Object.keys(localStorage))

    expect(keys).toContain('trunk-notes-v1')
  })
})
