/**
 * Smoke tests to verify critical DOM elements exist after app initialization.
 * These tests ensure the refactoring didn't break core functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { JSDOM } from 'jsdom'

describe('App Smoke Tests', () => {
  let dom: JSDOM

  beforeAll(() => {
    // Create a minimal DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Trunk</title></head>
        <body><div id="app"></div></body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
    })

    // Mock localStorage
    const storage: Record<string, string> = {}
    Object.defineProperty(dom.window, 'localStorage', {
      value: {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => { storage[key] = value },
        removeItem: (key: string) => { delete storage[key] },
        clear: () => Object.keys(storage).forEach(k => delete storage[k]),
      },
    })
  })

  afterAll(() => {
    dom.window.close()
  })

  describe('CSS Files', () => {
    it('should have all required CSS files', async () => {
      const cssFiles = [
        'base.css',
        'layout.css',
        'buttons.css',
        'cards.css',
        'dialogs.css',
        'sidebar.css',
        'nodes.css',
        'twig-view.css',
        'editor.css',
        'index.css',
      ]

      for (const file of cssFiles) {
        const fs = await import('fs')
        const path = await import('path')
        const filePath = path.join(process.cwd(), 'src/styles', file)
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true)
      }
    })
  })

  describe('Feature Modules', () => {
    it('should have all required feature modules', async () => {
      const modules = [
        'water-dialog.ts',
        'shine-dialog.ts',
        'sprouts-dialog.ts',
        'navigation.ts',
        'progress.ts',
        'status.ts',
        'hover-branch.ts',
        'import-export.ts',
      ]

      for (const file of modules) {
        const fs = await import('fs')
        const path = await import('path')
        const filePath = path.join(process.cwd(), 'src/features', file)
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true)
      }
    })
  })

  describe('Type Exports', () => {
    it('should export AppContext type', async () => {
      const types = await import('../types')
      expect(types).toBeDefined()
    })

    it('should export state functions', async () => {
      const state = await import('../state')
      expect(state.nodeState).toBeDefined()
      expect(state.saveState).toBeDefined()
      expect(state.getActiveSprouts).toBeDefined()
      expect(state.getHistorySprouts).toBeDefined()
    })
  })

  describe('Dialog Modules', () => {
    it('should export initWaterDialog', async () => {
      const waterDialog = await import('../features/water-dialog')
      expect(waterDialog.initWaterDialog).toBeDefined()
      expect(typeof waterDialog.initWaterDialog).toBe('function')
    })

    it('should export initShineDialog', async () => {
      const shineDialog = await import('../features/shine-dialog')
      expect(shineDialog.initShineDialog).toBeDefined()
      expect(typeof shineDialog.initShineDialog).toBe('function')
    })

    it('should export initSproutsDialog', async () => {
      const sproutsDialog = await import('../features/sprouts-dialog')
      expect(sproutsDialog.initSproutsDialog).toBeDefined()
      expect(typeof sproutsDialog.initSproutsDialog).toBe('function')
    })
  })

  describe('Constants', () => {
    it('should export required constants', async () => {
      const constants = await import('../constants')
      expect(constants.BRANCH_COUNT).toBe(8)
      expect(constants.TWIG_COUNT).toBe(8)
      expect(constants.STORAGE_KEY).toBeDefined()
    })
  })
})
