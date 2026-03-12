/**
 * Tests for features/account-dialog.ts
 * Tests the account dialog lifecycle, tab switching, theme, profile save,
 * sign out, and reset data confirmation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks (module-level, before any imports of the module under test)
// ---------------------------------------------------------------------------

vi.mock('../services/auth-service', () => ({
  signOut: vi.fn(() => Promise.resolve()),
  getAuthState: vi.fn(() => ({ user: { email: 'test@example.com' } })),
  getUserProfile: vi.fn(() => ({
    full_name: 'Test User',
    timezone: 'America/New_York',
  })),
  updateProfile: vi.fn(() => Promise.resolve({ error: null })),
}))

vi.mock('../services/sync', () => ({
  deleteAllEvents: vi.fn(() => Promise.resolve({ error: null })),
}))

vi.mock('../utils/theme', () => ({
  getTheme: vi.fn(() => 'auto'),
  setTheme: vi.fn(),
}))

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { initAccountDialog } from '../features/account-dialog'
import { getAuthState, getUserProfile, signOut, updateProfile } from '../services/auth-service'
import { deleteAllEvents } from '../services/sync'
import { getTheme, setTheme } from '../utils/theme'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockElements() {
  // Build the accountDialog with internal structure
  const accountDialog = document.createElement('div')
  accountDialog.classList.add('hidden')

  const dialogBox = document.createElement('div')
  dialogBox.classList.add('account-dialog-box')
  dialogBox.setAttribute('role', 'dialog')

  // Tabs
  const preferencesTab = document.createElement('button')
  preferencesTab.classList.add('account-tab')
  preferencesTab.dataset.tab = 'preferences'

  const profileTab = document.createElement('button')
  profileTab.classList.add('account-tab')
  profileTab.dataset.tab = 'profile'

  const dangerTab = document.createElement('button')
  dangerTab.classList.add('account-tab')
  dangerTab.dataset.tab = 'danger'

  // Tab panels
  const preferencesPanel = document.createElement('div')
  preferencesPanel.classList.add('account-tab-panel')
  preferencesPanel.dataset.tab = 'preferences'

  const profilePanel = document.createElement('div')
  profilePanel.classList.add('account-tab-panel')
  profilePanel.dataset.tab = 'profile'

  const dangerPanel = document.createElement('div')
  dangerPanel.classList.add('account-tab-panel')
  dangerPanel.dataset.tab = 'danger'

  // Theme radio inputs inside the dialog
  const themeAuto = document.createElement('input')
  themeAuto.type = 'radio'
  themeAuto.name = 'theme'
  themeAuto.value = 'auto'

  const themeLight = document.createElement('input')
  themeLight.type = 'radio'
  themeLight.name = 'theme'
  themeLight.value = 'light'

  const themeDark = document.createElement('input')
  themeDark.type = 'radio'
  themeDark.name = 'theme'
  themeDark.value = 'dark'

  preferencesPanel.appendChild(themeAuto)
  preferencesPanel.appendChild(themeLight)
  preferencesPanel.appendChild(themeDark)

  dialogBox.appendChild(preferencesTab)
  dialogBox.appendChild(profileTab)
  dialogBox.appendChild(dangerTab)
  dialogBox.appendChild(preferencesPanel)
  dialogBox.appendChild(profilePanel)
  dialogBox.appendChild(dangerPanel)
  accountDialog.appendChild(dialogBox)

  // Individual elements
  const accountDialogClose = document.createElement('button')
  const accountDialogEmail = document.createElement('p')
  const accountDialogNameInput = document.createElement('input')
  const accountDialogTimezoneSelect = document.createElement('select')
  const accountDialogSignOut = document.createElement('button')
  const accountDialogSave = document.createElement('button')
  accountDialogSave.textContent = 'Save'
  const accountDialogResetData = document.createElement('button')
  const accountDialogHarvestCheckbox = document.createElement('input')
  accountDialogHarvestCheckbox.type = 'checkbox'
  const accountDialogShineCheckbox = document.createElement('input')
  accountDialogShineCheckbox.type = 'checkbox'
  const profileBadge = document.createElement('div')

  // Empty NodeLists for notification inputs
  const emptyContainer = document.createElement('div')
  const accountDialogChannelInputs = emptyContainer.querySelectorAll<HTMLInputElement>('input')
  const accountDialogFrequencyInputs = emptyContainer.querySelectorAll<HTMLInputElement>('input')
  const accountDialogTimeInputs = emptyContainer.querySelectorAll<HTMLInputElement>('input')

  return {
    accountDialog,
    accountDialogClose,
    accountDialogEmail,
    accountDialogNameInput,
    accountDialogTimezoneSelect,
    accountDialogChannelInputs,
    accountDialogFrequencyInputs,
    accountDialogTimeInputs,
    accountDialogHarvestCheckbox,
    accountDialogShineCheckbox,
    accountDialogSignOut,
    accountDialogSave,
    accountDialogResetData,
    profileBadge,
    // Expose for test assertions
    _tabs: { preferencesTab, profileTab, dangerTab },
    _panels: { preferencesPanel, profilePanel, dangerPanel },
    _themeInputs: { themeAuto, themeLight, themeDark },
  }
}

type MockElements = ReturnType<typeof createMockElements>

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('account-dialog', () => {
  let els: MockElements

  beforeEach(() => {
    vi.clearAllMocks()

    // Re-apply default mock behaviors
    vi.mocked(getAuthState).mockReturnValue({ user: { email: 'test@example.com' } } as ReturnType<
      typeof getAuthState
    >)
    vi.mocked(getUserProfile).mockReturnValue({
      full_name: 'Test User',
      timezone: 'America/New_York',
    } as ReturnType<typeof getUserProfile>)
    vi.mocked(getTheme).mockReturnValue('auto')
    vi.mocked(updateProfile).mockResolvedValue({ error: null })
    vi.mocked(deleteAllEvents).mockResolvedValue({ error: null })

    els = createMockElements()
  })

  // =========================================================================
  // openDialog
  // =========================================================================

  describe('openDialog', () => {
    it('removes hidden class when profile badge is clicked', () => {
      initAccountDialog(els)

      els.profileBadge.click()
      expect(els.accountDialog.classList.contains('hidden')).toBe(false)
    })

    it('populates email from auth state', () => {
      initAccountDialog(els)

      els.profileBadge.click()
      expect(els.accountDialogEmail.textContent).toBe('test@example.com')
    })

    it('populates name from user profile', () => {
      initAccountDialog(els)

      els.profileBadge.click()
      expect(els.accountDialogNameInput.value).toBe('Test User')
    })

    it('populates timezone select with current timezone selected', () => {
      initAccountDialog(els)

      els.profileBadge.click()
      expect(els.accountDialogTimezoneSelect.value).toBe('America/New_York')
      expect(els.accountDialogTimezoneSelect.options.length).toBeGreaterThan(0)
    })

    it('resets to preferences tab on open', () => {
      initAccountDialog(els)

      // Switch to profile tab first
      els._tabs.profileTab.click()
      expect(els._tabs.profileTab.classList.contains('is-active')).toBe(true)

      // Close and re-open
      els.accountDialogClose.click()
      els.profileBadge.click()

      // Should be back on preferences
      expect(els._tabs.preferencesTab.classList.contains('is-active')).toBe(true)
      expect(els._panels.preferencesPanel.classList.contains('hidden')).toBe(false)
      expect(els._panels.profilePanel.classList.contains('hidden')).toBe(true)
    })

    it('checks the current theme radio', () => {
      vi.mocked(getTheme).mockReturnValue('dark')
      initAccountDialog(els)

      els.profileBadge.click()
      expect(els._themeInputs.themeDark.checked).toBe(true)
      expect(els._themeInputs.themeAuto.checked).toBe(false)
    })
  })

  // =========================================================================
  // closeDialog
  // =========================================================================

  describe('closeDialog', () => {
    it('adds hidden class when close button is clicked', () => {
      const api = initAccountDialog(els)

      els.profileBadge.click()
      expect(api.isOpen()).toBe(true)

      els.accountDialogClose.click()
      expect(els.accountDialog.classList.contains('hidden')).toBe(true)
    })

    it('closes when clicking the backdrop', () => {
      const api = initAccountDialog(els)

      els.profileBadge.click()
      expect(api.isOpen()).toBe(true)

      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: els.accountDialog })
      els.accountDialog.dispatchEvent(clickEvent)

      expect(api.isOpen()).toBe(false)
    })

    it('does not close when clicking inside the dialog box', () => {
      const api = initAccountDialog(els)

      els.profileBadge.click()

      const dialogBox = els.accountDialog.querySelector('.account-dialog-box')!
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: dialogBox })
      els.accountDialog.dispatchEvent(clickEvent)

      expect(api.isOpen()).toBe(true)
    })
  })

  // =========================================================================
  // isOpen
  // =========================================================================

  describe('isOpen', () => {
    it('returns false when dialog is hidden', () => {
      const api = initAccountDialog(els)
      expect(api.isOpen()).toBe(false)
    })

    it('returns true when dialog is open', () => {
      const api = initAccountDialog(els)
      els.profileBadge.click()
      expect(api.isOpen()).toBe(true)
    })

    it('returns false after closing', () => {
      const api = initAccountDialog(els)
      els.profileBadge.click()
      api.close()
      expect(api.isOpen()).toBe(false)
    })
  })

  // =========================================================================
  // Tab switching
  // =========================================================================

  describe('tab switching', () => {
    it('activates clicked tab and shows its panel', () => {
      initAccountDialog(els)
      els.profileBadge.click()

      els._tabs.profileTab.click()

      expect(els._tabs.profileTab.classList.contains('is-active')).toBe(true)
      expect(els._tabs.preferencesTab.classList.contains('is-active')).toBe(false)
      expect(els._panels.profilePanel.classList.contains('hidden')).toBe(false)
      expect(els._panels.preferencesPanel.classList.contains('hidden')).toBe(true)
    })

    it('switches between all three tabs', () => {
      initAccountDialog(els)
      els.profileBadge.click()

      els._tabs.dangerTab.click()
      expect(els._tabs.dangerTab.classList.contains('is-active')).toBe(true)
      expect(els._panels.dangerPanel.classList.contains('hidden')).toBe(false)

      els._tabs.preferencesTab.click()
      expect(els._tabs.preferencesTab.classList.contains('is-active')).toBe(true)
      expect(els._panels.preferencesPanel.classList.contains('hidden')).toBe(false)
      expect(els._panels.dangerPanel.classList.contains('hidden')).toBe(true)
    })
  })

  // =========================================================================
  // Theme switching
  // =========================================================================

  describe('theme switching', () => {
    it('calls setTheme when a theme radio is changed', () => {
      initAccountDialog(els)

      els._themeInputs.themeDark.dispatchEvent(new Event('change', { bubbles: true }))
      expect(setTheme).toHaveBeenCalledWith('dark')
    })

    it('calls setTheme with light value', () => {
      initAccountDialog(els)

      els._themeInputs.themeLight.dispatchEvent(new Event('change', { bubbles: true }))
      expect(setTheme).toHaveBeenCalledWith('light')
    })
  })

  // =========================================================================
  // Sign out
  // =========================================================================

  describe('sign out', () => {
    it('closes dialog and calls signOut', async () => {
      const api = initAccountDialog(els)
      els.profileBadge.click()

      els.accountDialogSignOut.click()

      expect(api.isOpen()).toBe(false)
      // Allow the async signOut to resolve
      await vi.waitFor(() => {
        expect(signOut).toHaveBeenCalledOnce()
      })
    })
  })

  // =========================================================================
  // Save profile
  // =========================================================================

  describe('save profile', () => {
    it('calls updateProfile with name and timezone on success', async () => {
      const api = initAccountDialog(els)
      els.profileBadge.click()

      els.accountDialogNameInput.value = '  New Name  '
      els.accountDialogTimezoneSelect.innerHTML = '<option value="America/Chicago">Chicago</option>'
      els.accountDialogTimezoneSelect.value = 'America/Chicago'

      els.accountDialogSave.click()

      await vi.waitFor(() => {
        expect(updateProfile).toHaveBeenCalledWith({
          full_name: 'New Name',
          timezone: 'America/Chicago',
        })
      })

      // Dialog should close on success
      expect(api.isOpen()).toBe(false)
    })

    it('shows "Saving..." while in progress', async () => {
      let resolveUpdate!: (value: { error: null }) => void
      vi.mocked(updateProfile).mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve
        }),
      )

      initAccountDialog(els)
      els.profileBadge.click()
      els.accountDialogSave.click()

      expect(els.accountDialogSave.textContent).toBe('Saving...')
      expect(els.accountDialogSave.disabled).toBe(true)

      resolveUpdate({ error: null })
      await vi.waitFor(() => {
        expect(els.accountDialogSave.disabled).toBe(false)
      })
    })

    it('shows "Error — try again" on failure', async () => {
      vi.mocked(updateProfile).mockResolvedValue({ error: 'Network error' } as any)

      initAccountDialog(els)
      els.profileBadge.click()
      els.accountDialogSave.click()

      await vi.waitFor(() => {
        expect(els.accountDialogSave.textContent).toBe('Error — try again')
      })
    })
  })

  // =========================================================================
  // Reset data
  // =========================================================================

  describe('reset data', () => {
    it('shows confirmation overlay when reset button is clicked', () => {
      initAccountDialog(els)
      els.profileBadge.click()

      els.accountDialogResetData.click()

      const overlay = els.accountDialog.querySelector('.reset-confirm-dialog')
      expect(overlay).not.toBeNull()
    })

    it('keeps submit disabled until "DELETE" is typed', () => {
      initAccountDialog(els)
      els.profileBadge.click()
      els.accountDialogResetData.click()

      const input = els.accountDialog.querySelector<HTMLInputElement>('.reset-confirm-input')!
      const submitBtn = els.accountDialog.querySelector<HTMLButtonElement>('.reset-confirm-submit')!

      expect(submitBtn.disabled).toBe(true)

      input.value = 'DELE'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      expect(submitBtn.disabled).toBe(true)

      input.value = 'DELETE'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      expect(submitBtn.disabled).toBe(false)
    })

    it('removes overlay when cancel is clicked', () => {
      initAccountDialog(els)
      els.profileBadge.click()
      els.accountDialogResetData.click()

      const cancelBtn = els.accountDialog.querySelector<HTMLButtonElement>('.reset-confirm-cancel')!
      cancelBtn.click()

      const overlay = els.accountDialog.querySelector('.reset-confirm-dialog')
      expect(overlay).toBeNull()
    })

    it('calls deleteAllEvents and reloads on success', async () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      })

      const api = initAccountDialog(els)
      els.profileBadge.click()
      els.accountDialogResetData.click()

      const input = els.accountDialog.querySelector<HTMLInputElement>('.reset-confirm-input')!
      const submitBtn = els.accountDialog.querySelector<HTMLButtonElement>('.reset-confirm-submit')!

      input.value = 'DELETE'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      submitBtn.click()

      await vi.waitFor(() => {
        expect(deleteAllEvents).toHaveBeenCalledOnce()
      })
      expect(reloadMock).toHaveBeenCalledOnce()
      expect(api.isOpen()).toBe(false)
    })

    it('shows error message on delete failure', async () => {
      vi.mocked(deleteAllEvents).mockResolvedValue({ error: 'Server error' })

      initAccountDialog(els)
      els.profileBadge.click()
      els.accountDialogResetData.click()

      const input = els.accountDialog.querySelector<HTMLInputElement>('.reset-confirm-input')!
      const submitBtn = els.accountDialog.querySelector<HTMLButtonElement>('.reset-confirm-submit')!

      input.value = 'DELETE'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      submitBtn.click()

      await vi.waitFor(() => {
        const msg = els.accountDialog.querySelector('.reset-confirm-message')!
        expect(msg.textContent).toContain('Failed to delete data')
        expect(msg.textContent).toContain('Server error')
      })
    })
  })

  // =========================================================================
  // Timezone dropdown
  // =========================================================================

  describe('timezone dropdown', () => {
    it('includes non-common timezone at the top when current is not in common list', () => {
      vi.mocked(getUserProfile).mockReturnValue({
        full_name: 'Test User',
        timezone: 'Asia/Kolkata',
      } as ReturnType<typeof getUserProfile>)

      initAccountDialog(els)
      els.profileBadge.click()

      const options = Array.from(els.accountDialogTimezoneSelect.options)
      expect(options[0].value).toBe('Asia/Kolkata')
      expect(options[0].selected).toBe(true)
    })

    it('formats timezone options with city name and abbreviation', () => {
      initAccountDialog(els)
      els.profileBadge.click()

      const firstOption = els.accountDialogTimezoneSelect.options[0]
      // Should contain the city name extracted from the timezone
      expect(firstOption.textContent).toContain('New York')
    })
  })
})
