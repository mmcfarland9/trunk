import type { AppElements } from '../types'
import { escapeHtml } from '../utils/escape-html'
import {
  sunLog,
  soilLog,
  getAllWaterEntries,
  getWaterAvailable,
  getWaterCapacity,
  getNextWaterReset,
  formatResetTime,
  getPresetLabel,
  nodeState,
} from '../state'
import { signOut, getAuthState, getUserProfile, updateProfile } from '../services/auth-service'

// --- Timestamp Formatters ---

function formatSunLogTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day} ${time}`
}

function formatSoilTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day} ${time}`
}

function formatWaterLogTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day}/${year} ${time}`
}

// --- Helper Functions ---

function getBranchLabelFromTwigId(twigId: string): string {
  const match = twigId.match(/^(branch-\d+)-twig-\d+$/)
  if (!match) return ''
  const branchId = match[1]
  return getPresetLabel(branchId) || nodeState[branchId]?.label || ''
}

// --- Sun Log Dialog ---

type SunLogElements = Pick<
  AppElements,
  'sunLogDialog' | 'sunLogDialogClose' | 'sunLogDialogEmpty' | 'sunLogDialogEntries'
>

function populateSunLog(elements: SunLogElements): void {
  const entries = [...sunLog].reverse()
  const isEmpty = entries.length === 0

  elements.sunLogDialogEmpty.style.display = isEmpty ? 'block' : 'none'
  elements.sunLogDialogEntries.style.display = isEmpty ? 'none' : 'flex'

  if (isEmpty) return

  elements.sunLogDialogEntries.innerHTML = entries.map(entry => {
    const branchLabel = getBranchLabelFromTwigId(entry.context.twigId)
    const context = branchLabel
      ? `${escapeHtml(branchLabel)} : ${escapeHtml(entry.context.twigLabel)}`
      : escapeHtml(entry.context.twigLabel)
    const timestamp = formatSunLogTimestamp(entry.timestamp)
    const promptHtml = entry.prompt
      ? `<p class="sun-log-entry-prompt">"${escapeHtml(entry.prompt)}"</p>`
      : ''

    return `
      <div class="sun-log-entry">
        <div class="sun-log-entry-header">
          <span class="sun-log-entry-context">${context}</span>
          <span class="sun-log-entry-timestamp">${timestamp}</span>
        </div>
        ${promptHtml}
        <p class="sun-log-entry-content">${escapeHtml(entry.content)}</p>
      </div>
    `
  }).join('')
}

export function initSunLogDialog(
  elements: SunLogElements & Pick<AppElements, 'sunMeter'>,
  callbacks: { onPopulateSunLogShine: () => void }
): { populate: () => void; isOpen: () => boolean; close: () => void } {
  const openDialog = () => {
    callbacks.onPopulateSunLogShine()
    populateSunLog(elements)
    elements.sunLogDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
    elements.sunLogDialog.classList.add('hidden')
  }

  elements.sunMeter.addEventListener('click', openDialog)
  elements.sunLogDialogClose.addEventListener('click', closeDialog)
  elements.sunLogDialog.addEventListener('click', (e) => {
    if (e.target === elements.sunLogDialog) closeDialog()
  })

  return {
    populate: () => populateSunLog(elements),
    isOpen: () => !elements.sunLogDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}

// --- Soil Bag Dialog ---

type SoilBagElements = Pick<
  AppElements,
  'soilBagDialog' | 'soilBagDialogClose' | 'soilBagDialogEmpty' | 'soilBagDialogEntries'
>

function populateSoilBag(elements: SoilBagElements): void {
  const entries = [...soilLog].reverse()
  const isEmpty = entries.length === 0

  elements.soilBagDialogEmpty.style.display = isEmpty ? 'block' : 'none'
  elements.soilBagDialogEntries.style.display = isEmpty ? 'none' : 'flex'

  if (isEmpty) return

  elements.soilBagDialogEntries.innerHTML = entries.map(entry => {
    const amountClass = entry.amount > 0 ? 'is-gain' : 'is-loss'
    const amountText = entry.amount > 0 ? `+${entry.amount.toFixed(2)}` : entry.amount.toFixed(2)
    const contextHtml = entry.context
      ? `<span class="soil-bag-entry-context">${escapeHtml(entry.context)}</span>`
      : ''
    const timestamp = formatSoilTimestamp(entry.timestamp)

    return `
      <div class="soil-bag-entry">
        <div class="soil-bag-entry-info">
          <span class="soil-bag-entry-reason">${escapeHtml(entry.reason)}</span>
          ${contextHtml}
        </div>
        <div>
          <span class="soil-bag-entry-amount ${amountClass}">${amountText}</span>
          <span class="soil-bag-entry-timestamp">${timestamp}</span>
        </div>
      </div>
    `
  }).join('')
}

export function initSoilBagDialog(
  elements: SoilBagElements & Pick<AppElements, 'soilMeter'>
): { isOpen: () => boolean; close: () => void } {
  const openDialog = () => {
    populateSoilBag(elements)
    elements.soilBagDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
    elements.soilBagDialog.classList.add('hidden')
  }

  elements.soilMeter.addEventListener('click', openDialog)
  elements.soilBagDialogClose.addEventListener('click', closeDialog)
  elements.soilBagDialog.addEventListener('click', (e) => {
    if (e.target === elements.soilBagDialog) closeDialog()
  })

  return {
    isOpen: () => !elements.soilBagDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}

// --- Water Can Dialog ---

type WaterCanElements = Pick<
  AppElements,
  | 'waterCanDialog'
  | 'waterCanDialogClose'
  | 'waterCanStatusText'
  | 'waterCanStatusReset'
  | 'waterCanEmptyLog'
  | 'waterCanLogEntries'
>

function populateWaterCan(elements: WaterCanElements): void {
  const logEntries = getAllWaterEntries()
  const available = getWaterAvailable()
  const capacity = getWaterCapacity()

  if (available > 0) {
    elements.waterCanStatusText.textContent = `${available}/${capacity} remaining`
    elements.waterCanStatusReset.classList.add('hidden')
  } else {
    elements.waterCanStatusText.textContent = 'Empty'
    elements.waterCanStatusReset.textContent = formatResetTime(getNextWaterReset())
    elements.waterCanStatusReset.classList.remove('hidden')
  }

  const hasLog = logEntries.length > 0
  elements.waterCanEmptyLog.style.display = hasLog ? 'none' : 'block'
  elements.waterCanLogEntries.style.display = hasLog ? 'flex' : 'none'

  if (hasLog) {
    elements.waterCanLogEntries.innerHTML = logEntries.map(entry => {
      const timestamp = formatWaterLogTimestamp(entry.timestamp)
      const promptHtml = entry.prompt
        ? `<p class="water-can-log-entry-prompt">"${escapeHtml(entry.prompt)}"</p>`
        : ''

      return `
        <div class="water-can-log-entry">
          <div class="water-can-log-entry-header">
            <span class="water-can-log-entry-context">${escapeHtml(entry.sproutTitle)} · ${escapeHtml(entry.twigLabel)}</span>
            <span class="water-can-log-entry-timestamp">${timestamp}</span>
          </div>
          ${promptHtml}
          <p class="water-can-log-entry-content">${escapeHtml(entry.content)}</p>
        </div>
      `
    }).join('')
  }
}

export function initWaterCanDialog(
  elements: WaterCanElements & Pick<AppElements, 'waterMeter'>
): { isOpen: () => boolean; close: () => void } {
  const openDialog = () => {
    populateWaterCan(elements)
    elements.waterCanDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
    elements.waterCanDialog.classList.add('hidden')
  }

  elements.waterMeter.addEventListener('click', openDialog)
  elements.waterCanDialogClose.addEventListener('click', closeDialog)
  elements.waterCanDialog.addEventListener('click', (e) => {
    if (e.target === elements.waterCanDialog) closeDialog()
  })

  return {
    isOpen: () => !elements.waterCanDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}

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
  const openDialog = () => {
    populateAccountDialog(elements)
    elements.accountDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
    elements.accountDialog.classList.add('hidden')
  }

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
