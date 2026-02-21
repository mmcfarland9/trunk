/**
 * Tests for ui/dom-builder/build-dialogs.ts
 * Tests dialog creation (buildDialogs) and focus trap behavior (trapFocus).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildDialogs, trapFocus } from '../ui/dom-builder/build-dialogs'
import type { DialogElements } from '../ui/dom-builder/build-dialogs'

const DIALOG_KEYS: (keyof DialogElements)[] = [
  'sproutsDialog',
  'waterDialog',
  'harvestDialog',
  'waterCanDialog',
  'sunLogDialog',
  'soilBagDialog',
  'accountDialog',
]

describe('buildDialogs', () => {
  let dialogs: DialogElements

  beforeEach(() => {
    dialogs = buildDialogs()
  })

  it('creates all 7 dialogs as HTMLDivElement', () => {
    for (const key of DIALOG_KEYS) {
      expect(dialogs[key]).toBeInstanceOf(HTMLDivElement)
    }
    expect(DIALOG_KEYS.length).toBe(7)
  })

  it('all dialogs start with hidden class', () => {
    for (const key of DIALOG_KEYS) {
      expect(dialogs[key].classList.contains('hidden')).toBe(true)
    }
  })

  it('each dialog has role="dialog" and aria-modal="true" on its inner box', () => {
    for (const key of DIALOG_KEYS) {
      const dialogBox = dialogs[key].querySelector('[role="dialog"]') as HTMLElement
      expect(dialogBox).not.toBeNull()
      expect(dialogBox.getAttribute('aria-modal')).toBe('true')
    }
  })

  it('each dialog has a close button with aria-label="Close dialog"', () => {
    for (const key of DIALOG_KEYS) {
      const closeBtn = dialogs[key].querySelector(
        'button[aria-label="Close dialog"]',
      ) as HTMLButtonElement
      expect(closeBtn).not.toBeNull()
      expect(closeBtn.tagName).toBe('BUTTON')
    }
  })

  describe('harvest dialog specifics', () => {
    it('has a slider with min=1 and max=5', () => {
      const slider = dialogs.harvestDialog.querySelector(
        'input[type="range"]',
      ) as HTMLInputElement
      expect(slider).not.toBeNull()
      expect(slider.min).toBe('1')
      expect(slider.max).toBe('5')
      expect(slider.value).toBe('3')
    })

    it('has cancel and harvest action buttons', () => {
      const cancel = dialogs.harvestDialog.querySelector('.harvest-dialog-cancel')
      const save = dialogs.harvestDialog.querySelector('.harvest-dialog-save')
      expect(cancel).not.toBeNull()
      expect(save).not.toBeNull()
      expect(save?.textContent).toBe('Harvest')
    })

    it('has a reflection textarea with maxlength', () => {
      const textarea = dialogs.harvestDialog.querySelector(
        'textarea.harvest-dialog-reflection',
      ) as HTMLTextAreaElement
      expect(textarea).not.toBeNull()
      expect(textarea.maxLength).toBe(2000)
    })

    it('has bloom hint elements with data-level attributes', () => {
      const hints = dialogs.harvestDialog.querySelectorAll('.harvest-dialog-bloom-hint')
      expect(hints.length).toBe(3)
      expect((hints[0] as HTMLElement).dataset.level).toBe('1')
      expect((hints[1] as HTMLElement).dataset.level).toBe('3')
      expect((hints[2] as HTMLElement).dataset.level).toBe('5')
    })
  })

  describe('account dialog specifics', () => {
    it('has tabs for notifications and data', () => {
      const tabs = dialogs.accountDialog.querySelectorAll('.account-tab')
      expect(tabs.length).toBe(2)
      expect((tabs[0] as HTMLElement).dataset.tab).toBe('notifications')
      expect((tabs[1] as HTMLElement).dataset.tab).toBe('data')
    })

    it('has notifications tab active by default', () => {
      const activeTab = dialogs.accountDialog.querySelector('.account-tab.is-active') as HTMLElement
      expect(activeTab).not.toBeNull()
      expect(activeTab.dataset.tab).toBe('notifications')
    })

    it('has tab panels for notifications and data', () => {
      const panels = dialogs.accountDialog.querySelectorAll('.account-tab-panel')
      expect(panels.length).toBe(2)
      // Notifications panel is visible, data panel is hidden
      const dataPanel = dialogs.accountDialog.querySelector(
        '.account-tab-panel[data-tab="data"]',
      ) as HTMLElement
      expect(dataPanel.classList.contains('hidden')).toBe(true)
    })

    it('has sign out and save buttons', () => {
      const signOut = dialogs.accountDialog.querySelector('.account-sign-out-btn')
      const save = dialogs.accountDialog.querySelector('.account-save-btn')
      expect(signOut).not.toBeNull()
      expect(save).not.toBeNull()
    })

    it('has name and phone inputs', () => {
      const nameInput = dialogs.accountDialog.querySelector('.account-name-input') as HTMLInputElement
      const phoneInput = dialogs.accountDialog.querySelector(
        '.account-phone-input',
      ) as HTMLInputElement
      expect(nameInput).not.toBeNull()
      expect(nameInput.type).toBe('text')
      expect(phoneInput).not.toBeNull()
      expect(phoneInput.type).toBe('tel')
    })

    it('has timezone select', () => {
      const tz = dialogs.accountDialog.querySelector('.account-timezone-select') as HTMLSelectElement
      expect(tz).not.toBeNull()
      expect(tz.tagName).toBe('SELECT')
    })

    it('has reset data button in data tab', () => {
      const resetBtn = dialogs.accountDialog.querySelector('.account-reset-data-btn')
      expect(resetBtn).not.toBeNull()
    })
  })

  describe('water dialog specifics', () => {
    it('has a dialog body for dynamic content', () => {
      const body = dialogs.waterDialog.querySelector('.water-dialog-body')
      expect(body).not.toBeNull()
    })
  })

  describe('water can dialog specifics', () => {
    it('has a status box and log section', () => {
      const statusBox = dialogs.waterCanDialog.querySelector('.water-can-status-box')
      const logSection = dialogs.waterCanDialog.querySelector('.water-can-log-section')
      expect(statusBox).not.toBeNull()
      expect(logSection).not.toBeNull()
    })
  })

  describe('sun log dialog specifics', () => {
    it('has a shine section with journal textarea', () => {
      const journal = dialogs.sunLogDialog.querySelector(
        'textarea.sun-log-shine-journal',
      ) as HTMLTextAreaElement
      expect(journal).not.toBeNull()
      expect(journal.maxLength).toBe(2000)
    })

    it('has a radiate button', () => {
      const btn = dialogs.sunLogDialog.querySelector('.sun-log-shine-btn')
      expect(btn).not.toBeNull()
      expect(btn?.textContent).toBe('Radiate')
    })
  })

  describe('soil bag dialog specifics', () => {
    it('has entries container and empty message', () => {
      const entries = dialogs.soilBagDialog.querySelector('.soil-bag-entries')
      const empty = dialogs.soilBagDialog.querySelector('.soil-bag-empty')
      expect(entries).not.toBeNull()
      expect(empty).not.toBeNull()
    })
  })
})

describe('trapFocus', () => {
  let dialogBox: HTMLDivElement
  let btn1: HTMLButtonElement
  let btn2: HTMLButtonElement
  let btn3: HTMLButtonElement

  /** Helper to create and dispatch a KeyboardEvent on the dialog */
  function dispatchTab(shiftKey = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey,
      bubbles: true,
      cancelable: true,
    })
    dialogBox.dispatchEvent(event)
    return event
  }

  function dispatchKey(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
    dialogBox.dispatchEvent(event)
    return event
  }

  beforeEach(() => {
    dialogBox = document.createElement('div')
    btn1 = document.createElement('button')
    btn1.textContent = 'First'
    btn2 = document.createElement('button')
    btn2.textContent = 'Second'
    btn3 = document.createElement('button')
    btn3.textContent = 'Third'
    dialogBox.appendChild(btn1)
    dialogBox.appendChild(btn2)
    dialogBox.appendChild(btn3)
    document.body.appendChild(dialogBox)
  })

  afterEach(() => {
    dialogBox.remove()
  })

  it('focuses the first focusable element in the dialog when called', () => {
    trapFocus(dialogBox)
    expect(document.activeElement).toBe(btn1)
  })

  it('Tab on last element wraps to first element', () => {
    trapFocus(dialogBox)
    btn3.focus()
    expect(document.activeElement).toBe(btn3)

    const event = dispatchTab(false)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(btn1)
  })

  it('Shift+Tab on first element wraps to last element', () => {
    trapFocus(dialogBox)
    btn1.focus()
    expect(document.activeElement).toBe(btn1)

    const event = dispatchTab(true)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(btn3)
  })

  it('Tab on middle element does not prevent default (browser handles it)', () => {
    trapFocus(dialogBox)
    btn2.focus()

    const event = dispatchTab(false)

    // Middle element - not first or last, so no preventDefault
    expect(event.defaultPrevented).toBe(false)
  })

  it('non-Tab keys are not intercepted', () => {
    trapFocus(dialogBox)
    btn1.focus()

    const escapeEvent = dispatchKey('Escape')
    expect(escapeEvent.defaultPrevented).toBe(false)

    const enterEvent = dispatchKey('Enter')
    expect(enterEvent.defaultPrevented).toBe(false)

    const arrowEvent = dispatchKey('ArrowDown')
    expect(arrowEvent.defaultPrevented).toBe(false)
  })

  it('cleanup function removes the keydown listener', () => {
    const cleanup = trapFocus(dialogBox)
    btn3.focus()

    // Before cleanup, Tab on last wraps
    const event1 = dispatchTab(false)
    expect(event1.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(btn1)

    cleanup()

    // After cleanup, Tab on last does NOT wrap (listener removed)
    btn3.focus()
    const event2 = dispatchTab(false)
    expect(event2.defaultPrevented).toBe(false)
  })

  it('cleanup function restores focus to previously focused element', () => {
    // Set up a button outside the dialog that was focused before opening
    const outsideBtn = document.createElement('button')
    outsideBtn.textContent = 'Outside'
    document.body.appendChild(outsideBtn)
    outsideBtn.focus()
    expect(document.activeElement).toBe(outsideBtn)

    const cleanup = trapFocus(dialogBox)
    // Focus moved into dialog
    expect(document.activeElement).toBe(btn1)

    cleanup()
    // Focus restored to outside button
    expect(document.activeElement).toBe(outsideBtn)

    outsideBtn.remove()
  })

  it('cleanup falls back to document.body when previously focused element was removed', () => {
    const tempBtn = document.createElement('button')
    tempBtn.textContent = 'Temp'
    document.body.appendChild(tempBtn)
    tempBtn.focus()
    expect(document.activeElement).toBe(tempBtn)

    const cleanup = trapFocus(dialogBox)
    expect(document.activeElement).toBe(btn1)

    // Remove the previously focused element from DOM
    tempBtn.remove()

    // Spy on document.body.focus to verify the fallback path is taken
    const bodyFocusSpy = vi.spyOn(document.body, 'focus')

    cleanup()

    // The code calls document.body.focus() when previouslyFocused is disconnected
    expect(bodyFocusSpy).toHaveBeenCalled()
    // The removed tempBtn should NOT receive focus
    expect(document.activeElement).not.toBe(tempBtn)

    bodyFocusSpy.mockRestore()
  })

  it('handles dialog with no focusable elements', () => {
    const emptyDialog = document.createElement('div')
    emptyDialog.innerHTML = '<p>No focusable content here</p>'
    document.body.appendChild(emptyDialog)

    // Should not throw
    const cleanup = trapFocus(emptyDialog)

    // Tab should not cause errors
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    emptyDialog.dispatchEvent(event)
    // No preventDefault since focusable.length === 0
    expect(event.defaultPrevented).toBe(false)

    cleanup()
    emptyDialog.remove()
  })

  it('handles dialog with disabled buttons (excluded from focusable)', () => {
    const disabledDialog = document.createElement('div')
    const enabledBtn = document.createElement('button')
    enabledBtn.textContent = 'Enabled'
    const disabledBtn = document.createElement('button')
    disabledBtn.textContent = 'Disabled'
    disabledBtn.disabled = true
    disabledDialog.appendChild(enabledBtn)
    disabledDialog.appendChild(disabledBtn)
    document.body.appendChild(disabledDialog)

    trapFocus(disabledDialog)
    // Only the enabled button is focusable
    expect(document.activeElement).toBe(enabledBtn)

    // Tab on the only focusable element wraps to itself
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    disabledDialog.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(enabledBtn)

    disabledDialog.remove()
  })

  it('handles dialog with inputs, selects, and textareas as focusable elements', () => {
    const formDialog = document.createElement('div')
    const input = document.createElement('input')
    input.type = 'text'
    const select = document.createElement('select')
    const textarea = document.createElement('textarea')
    formDialog.appendChild(input)
    formDialog.appendChild(select)
    formDialog.appendChild(textarea)
    document.body.appendChild(formDialog)

    trapFocus(formDialog)
    expect(document.activeElement).toBe(input)

    // Focus last element, then Tab wraps to first
    textarea.focus()
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    formDialog.dispatchEvent(event)
    expect(document.activeElement).toBe(input)

    formDialog.remove()
  })
})
