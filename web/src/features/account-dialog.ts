import type { AppElements } from '../types'
import { signOut, getAuthState, getUserProfile, updateProfile } from '../services/auth-service'
import { deleteAllEvents } from '../services/sync'
import { exportEvents, replaceEvents } from '../events'
import { getTheme, setTheme } from '../utils/theme'
import { STORAGE_KEYS } from '../generated/constants'
import { trapFocus } from '../ui/dom-builder/build-dialogs'

// --- Account Dialog ---

type AccountElements = Pick<
  AppElements,
  | 'accountDialog'
  | 'accountDialogClose'
  | 'accountDialogEmail'
  | 'accountDialogNameInput'
  | 'accountDialogPhoneInput'
  | 'accountDialogTimezoneSelect'
  | 'accountDialogChannelInputs'
  | 'accountDialogFrequencyInputs'
  | 'accountDialogTimeInputs'
  | 'accountDialogHarvestCheckbox'
  | 'accountDialogShineCheckbox'
  | 'accountDialogSignOut'
  | 'accountDialogSave'
  | 'accountDialogExportData'
  | 'accountDialogImportData'
  | 'accountDialogResetData'
  | 'profileBadge'
>

// Common timezones for the dropdown
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
]

function formatTimezone(tz: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(now)
    const tzAbbr = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz
    return `${city} (${tzAbbr})`
  } catch {
    return tz
  }
}

function updateNotifyOptionsVisibility(elements: AccountElements, channel: string): void {
  const notifyOptions = elements.accountDialog.querySelectorAll('.account-notify-options')
  const isOff = channel === 'none'
  notifyOptions.forEach((el) => {
    ;(el as HTMLElement).style.opacity = isOff ? '0.4' : '1'
    ;(el as HTMLElement).style.pointerEvents = isOff ? 'none' : 'auto'
  })
}

function populateTimezoneSelect(select: HTMLSelectElement, currentTz: string): void {
  select.innerHTML = ''

  // Ensure current timezone is in the list
  const timezones = COMMON_TIMEZONES.includes(currentTz)
    ? COMMON_TIMEZONES
    : [currentTz, ...COMMON_TIMEZONES]

  for (const tz of timezones) {
    const option = document.createElement('option')
    option.value = tz
    option.textContent = formatTimezone(tz)
    option.selected = tz === currentTz
    select.appendChild(option)
  }
}

function populateAccountDialog(elements: AccountElements): void {
  const { user } = getAuthState()
  const profile = getUserProfile()

  elements.accountDialogEmail.textContent = user?.email || ''
  elements.accountDialogNameInput.value = profile.full_name || ''
  elements.accountDialogPhoneInput.value = profile.phone || ''
  populateTimezoneSelect(
    elements.accountDialogTimezoneSelect,
    profile.timezone || 'America/New_York',
  )

  // Notification preferences
  const notif = profile.notifications!
  elements.accountDialogChannelInputs.forEach((input) => {
    input.checked = input.value === notif.channel
  })
  elements.accountDialogFrequencyInputs.forEach((input) => {
    input.checked = input.value === notif.check_in_frequency
  })
  elements.accountDialogTimeInputs.forEach((input) => {
    input.checked = input.value === notif.preferred_time
  })
  elements.accountDialogHarvestCheckbox.checked = notif.notify_harvest_ready
  elements.accountDialogShineCheckbox.checked = notif.notify_shine_available

  // Update visibility of notification options based on channel
  updateNotifyOptionsVisibility(elements, notif.channel)

  // Theme preference
  const currentTheme = getTheme()
  const themeInputs =
    elements.accountDialog.querySelectorAll<HTMLInputElement>('input[name="theme"]')
  themeInputs.forEach((input) => {
    input.checked = input.value === currentTheme
  })
}

function showResetConfirmation(elements: AccountElements, closeDialog: () => void): void {
  // Build confirmation overlay inside the account dialog
  const overlay = document.createElement('div')
  overlay.className = 'reset-confirm-overlay'
  overlay.innerHTML = `
    <div class="reset-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-desc">
      <h3 id="reset-confirm-title" class="reset-confirm-title">Delete All Data</h3>
      <p id="reset-confirm-desc" class="reset-confirm-message">
        This will permanently remove all your sprouts, leaves, journal entries, and activity history. This action cannot be undone.
      </p>
      <label class="reset-confirm-label" for="reset-confirm-input">Type <strong>DELETE</strong> to confirm</label>
      <input id="reset-confirm-input" type="text" class="reset-confirm-input account-input" autocomplete="off" spellcheck="false" />
      <div class="reset-confirm-actions">
        <button type="button" class="action-btn action-btn-passive action-btn-neutral reset-confirm-cancel">Cancel</button>
        <button type="button" class="action-btn action-btn-progress action-btn-error reset-confirm-submit" disabled>Delete Everything</button>
      </div>
    </div>
  `

  const input = overlay.querySelector<HTMLInputElement>('.reset-confirm-input')!
  const submitBtn = overlay.querySelector<HTMLButtonElement>('.reset-confirm-submit')!
  const cancelBtn = overlay.querySelector<HTMLButtonElement>('.reset-confirm-cancel')!

  const alertDialogBox = overlay.querySelector<HTMLElement>('[role="alertdialog"]')!
  let releaseFocusTrap: (() => void) | null = null

  const cleanup = () => {
    releaseFocusTrap?.()
    releaseFocusTrap = null
    overlay.remove()
  }

  // Enable submit only when input is exactly "DELETE"
  input.addEventListener('input', () => {
    submitBtn.disabled = input.value !== 'DELETE'
  })

  cancelBtn.addEventListener('click', cleanup)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup()
  })

  submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true
    submitBtn.textContent = 'Deleting...'
    input.disabled = true
    cancelBtn.disabled = true

    const { error } = await deleteAllEvents()

    if (error) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Delete Everything'
      input.disabled = false
      cancelBtn.disabled = false
      input.value = ''
      submitBtn.disabled = true
      // Show inline error
      const msg = overlay.querySelector('.reset-confirm-message')!
      msg.textContent = `Failed to delete data: ${error}. Please try again.`
    } else {
      cleanup()
      closeDialog()
      window.location.reload()
    }
  })

  elements.accountDialog.querySelector('.account-dialog-box')!.appendChild(overlay)
  releaseFocusTrap = trapFocus(alertDialogBox)
}

export function initAccountDialog(elements: AccountElements): {
  isOpen: () => boolean
  close: () => void
} {
  const tabs = elements.accountDialog.querySelectorAll<HTMLButtonElement>('.account-tab')
  const panels = elements.accountDialog.querySelectorAll<HTMLDivElement>('.account-tab-panel')

  const switchTab = (tabName: string) => {
    tabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.tab === tabName)
    })
    panels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.tab !== tabName)
    })
  }

  let releaseFocusTrap: (() => void) | null = null

  const openDialog = () => {
    populateAccountDialog(elements)
    switchTab('preferences') // Reset to first tab
    elements.accountDialog.classList.remove('hidden')
    const dialogBox = elements.accountDialog.querySelector<HTMLElement>('[role="dialog"]')
    if (dialogBox) releaseFocusTrap = trapFocus(dialogBox)
  }

  const closeDialog = () => {
    releaseFocusTrap?.()
    releaseFocusTrap = null
    elements.accountDialog.classList.add('hidden')
  }

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab
      if (tabName) switchTab(tabName)
    })
  })

  elements.profileBadge.addEventListener('click', openDialog)
  elements.accountDialogClose.addEventListener('click', closeDialog)
  elements.accountDialog.addEventListener('click', (e) => {
    if (e.target === elements.accountDialog) closeDialog()
  })

  // Theme preference — apply immediately on change
  const themeInputs =
    elements.accountDialog.querySelectorAll<HTMLInputElement>('input[name="theme"]')
  themeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      setTheme(input.value as 'auto' | 'light' | 'dark')
    })
  })

  // Update notify options visibility when channel changes
  elements.accountDialogChannelInputs.forEach((input) => {
    input.addEventListener('change', () => {
      updateNotifyOptionsVisibility(elements, input.value)
    })
  })

  elements.accountDialogSignOut.addEventListener('click', async () => {
    closeDialog()
    await signOut()
  })

  // Export data — download events as JSON
  elements.accountDialogExportData.addEventListener('click', () => {
    const events = exportEvents()
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trunk${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    localStorage.setItem(STORAGE_KEYS.lastExport, Date.now().toString())
  })

  // Import data — file picker + confirmation
  elements.accountDialogImportData.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          if (!Array.isArray(data)) {
            alert('Invalid file: expected an array of events.')
            return
          }

          const confirmed = window.confirm(
            `Import ${data.length} events?\n\nThis will replace ALL existing data. This action cannot be undone.`,
          )
          if (!confirmed) return

          replaceEvents(data)
          closeDialog()
          window.location.reload()
        } catch {
          alert('Failed to read file: invalid JSON.')
        }
      }
      reader.readAsText(file)
    })
    input.click()
  })

  // Reset all data with typed DELETE confirmation
  elements.accountDialogResetData.addEventListener('click', () => {
    showResetConfirmation(elements, closeDialog)
  })

  elements.accountDialogSave.addEventListener('click', async () => {
    // Get selected radio values
    const getSelectedRadio = (inputs: NodeListOf<HTMLInputElement>): string => {
      for (const input of inputs) {
        if (input.checked) return input.value
      }
      return ''
    }

    const profile = {
      full_name: elements.accountDialogNameInput.value.trim(),
      phone: elements.accountDialogPhoneInput.value.trim(),
      timezone: elements.accountDialogTimezoneSelect.value,
      notifications: {
        channel: getSelectedRadio(elements.accountDialogChannelInputs) as 'email' | 'sms' | 'none',
        check_in_frequency: getSelectedRadio(elements.accountDialogFrequencyInputs) as
          | 'daily'
          | 'every3days'
          | 'weekly'
          | 'off',
        preferred_time: getSelectedRadio(elements.accountDialogTimeInputs) as
          | 'morning'
          | 'afternoon'
          | 'evening',
        notify_harvest_ready: elements.accountDialogHarvestCheckbox.checked,
        notify_shine_available: elements.accountDialogShineCheckbox.checked,
      },
    }

    elements.accountDialogSave.disabled = true
    elements.accountDialogSave.textContent = 'Saving...'

    const { error } = await updateProfile(profile)

    elements.accountDialogSave.disabled = false
    elements.accountDialogSave.textContent = 'Save'

    if (error) {
      elements.accountDialogSave.textContent = 'Error — try again'
      setTimeout(() => {
        elements.accountDialogSave.textContent = 'Save'
      }, 2000)
    } else {
      closeDialog()
    }
  })

  return {
    isOpen: () => !elements.accountDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}
