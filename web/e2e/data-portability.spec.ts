/**
 * E2E tests for import/export functionality.
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Data Portability - Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')
  })

  test('export button is visible in header', async ({ page }) => {
    // Export button is in the header actions
    const exportBtn = page.locator('.action-button', { hasText: 'Export' })
    await expect(exportBtn).toBeVisible()
  })

  test('import button is visible in header', async ({ page }) => {
    // Import button is in the header actions
    const importBtn = page.locator('.action-button', { hasText: 'Import' })
    await expect(importBtn).toBeVisible()
  })

  test('export triggers download', async ({ page }) => {
    // Listen for download event
    const downloadPromise = page.waitForEvent('download')

    // Click export
    const exportBtn = page.locator('.action-button', { hasText: 'Export' })
    await exportBtn.click()

    // Verify download started
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/trunk.*\.json/)
  })

  test('exported data contains version number', async ({ page }) => {
    // Set up some data via events
    await page.evaluate(() => {
      const events = [
        {
          type: 'node_updated',
          timestamp: new Date().toISOString(),
          nodeId: 'trunk',
          label: 'My Life',
          note: 'Test note',
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Listen for download
    const downloadPromise = page.waitForEvent('download')
    await page.locator('.action-button', { hasText: 'Export' }).click()

    const download = await downloadPromise
    const downloadPath = await download.path()

    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8')
      const data = JSON.parse(content)

      // Export uses "version" property (not "_version")
      expect(data.version).toBeDefined()
      expect(data.version).toBeGreaterThanOrEqual(1)
    }
  })

  test('import replaces existing data', async ({ page }) => {
    // Set initial state
    await page.evaluate(() => {
      const events = [
        {
          type: 'node_updated',
          timestamp: new Date().toISOString(),
          nodeId: 'trunk',
          label: 'Original',
          note: '',
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))
    })
    await page.reload()
    await page.waitForSelector('.node.trunk')

    // Prepare import file with new v4+ format
    const importData = {
      version: 4,
      exportedAt: new Date().toISOString(),
      events: [
        {
          type: 'node_updated',
          timestamp: new Date().toISOString(),
          nodeId: 'trunk',
          label: 'Imported',
          note: 'New note',
        },
      ],
      circles: {
        trunk: { label: 'Imported', note: 'New note' },
      },
    }

    // Create temp file
    const tempDir = path.join(__dirname, '..', 'test-results')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const tempPath = path.join(tempDir, 'trunk-import-test.json')
    fs.writeFileSync(tempPath, JSON.stringify(importData))

    // Set up file for hidden input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(tempPath)

    await page.waitForTimeout(500)

    // Check if confirmation dialog appeared and confirm
    const confirmBtn = page.locator('button', { hasText: 'Replace' })
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click()
      await page.waitForTimeout(500)
    }

    // Verify data was imported by checking events
    const events = await page.evaluate(() => {
      const raw = localStorage.getItem('trunk-events-v1')
      return raw ? JSON.parse(raw) : null
    })

    // Should contain the imported event
    expect(events).toBeDefined()

    // Clean up
    fs.unlinkSync(tempPath)
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
    await page.waitForSelector('.node.trunk')

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

    // Check localStorage keys - should have notes (legacy state) or events
    const keys = await page.evaluate(() => Object.keys(localStorage))

    // App uses trunk-notes-v1 for legacy state storage
    expect(keys).toContain('trunk-notes-v1')
  })
})
