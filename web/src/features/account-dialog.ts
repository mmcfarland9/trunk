import type { AppElements } from '../types'
import { signOut, getAuthState, getUserProfile, updateProfile } from '../services/auth-service'
import { deleteAllEvents, forceFullSync } from '../services/sync-service'

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
  | 'accountDialogResetData'
  | 'accountDialogForceSync'
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
    const tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || ''
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz
    return `${city} (${tzAbbr})`
  } catch {
    return tz
  }
}

function updateNotifyOptionsVisibility(elements: AccountElements, channel: string): void {
  const notifyOptions = elements.accountDialog.querySelectorAll('.account-notify-options')
  const isOff = channel === 'none'
  notifyOptions.forEach(el => {
    (el as HTMLElement).style.opacity = isOff ? '0.4' : '1'
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
  populateTimezoneSelect(elements.accountDialogTimezoneSelect, profile.timezone || 'America/New_York')

  // Notification preferences
  const notif = profile.notifications!
  elements.accountDialogChannelInputs.forEach(input => {
    input.checked = input.value === notif.channel
  })
  elements.accountDialogFrequencyInputs.forEach(input => {
    input.checked = input.value === notif.check_in_frequency
  })
  elements.accountDialogTimeInputs.forEach(input => {
    input.checked = input.value === notif.preferred_time
  })
  elements.accountDialogHarvestCheckbox.checked = notif.notify_harvest_ready
  elements.accountDialogShineCheckbox.checked = notif.notify_shine_available

  // Update visibility of notification options based on channel
  updateNotifyOptionsVisibility(elements, notif.channel)
}

export function initAccountDialog(
  elements: AccountElements
): { isOpen: () => boolean; close: () => void } {
  const tabs = elements.accountDialog.querySelectorAll<HTMLButtonElement>('.account-tab')
  const panels = elements.accountDialog.querySelectorAll<HTMLDivElement>('.account-tab-panel')

  const switchTab = (tabName: string) => {
    tabs.forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.tab === tabName)
    })
    panels.forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.tab !== tabName)
    })
  }

  const openDialog = () => {
    populateAccountDialog(elements)
    switchTab('notifications') // Reset to first tab
    elements.accountDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
    elements.accountDialog.classList.add('hidden')
  }

  // Tab switching
  tabs.forEach(tab => {
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

  // Update notify options visibility when channel changes
  elements.accountDialogChannelInputs.forEach(input => {
    input.addEventListener('change', () => {
      updateNotifyOptionsVisibility(elements, input.value)
    })
  })

  elements.accountDialogSignOut.addEventListener('click', async () => {
    closeDialog()
    await signOut()
  })

  // Reset all data with confirmation
  elements.accountDialogResetData.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL your data?\n\n' +
      'This will permanently remove all your sprouts, leaves, journal entries, and activity history.\n\n' +
      'This action cannot be undone.'
    )

    if (!confirmed) return

    elements.accountDialogResetData.disabled = true
    elements.accountDialogResetData.textContent = 'Deleting...'

    const { error } = await deleteAllEvents()

    elements.accountDialogResetData.disabled = false
    elements.accountDialogResetData.textContent = 'Reset All Data'

    if (error) {
      console.error('Failed to delete data:', error)
      alert('Failed to delete data: ' + error)
    } else {
      closeDialog()
      window.location.reload()
    }
  })

  // Force full sync with confirmation
  elements.accountDialogForceSync.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Force a full sync from the cloud?\n\n' +
      'This will re-download all your data from the server, picking up any changes made directly in the database.'
    )

    if (!confirmed) return

    elements.accountDialogForceSync.disabled = true
    elements.accountDialogForceSync.textContent = 'Syncing...'

    const result = await forceFullSync()

    elements.accountDialogForceSync.disabled = false
    elements.accountDialogForceSync.textContent = 'Force Full Sync'

    if (result.error) {
      alert('Sync failed: ' + result.error)
    } else {
      closeDialog()
      window.location.reload()
    }
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
        check_in_frequency: getSelectedRadio(elements.accountDialogFrequencyInputs) as 'daily' | 'every3days' | 'weekly' | 'off',
        preferred_time: getSelectedRadio(elements.accountDialogTimeInputs) as 'morning' | 'afternoon' | 'evening',
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
      console.error('Failed to save profile:', error)
    } else {
      closeDialog()
    }
  })

  return {
    isOpen: () => !elements.accountDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}
