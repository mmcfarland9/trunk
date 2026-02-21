export type DialogElements = {
  sproutsDialog: HTMLDivElement
  waterDialog: HTMLDivElement
  harvestDialog: HTMLDivElement
  waterCanDialog: HTMLDivElement
  sunLogDialog: HTMLDivElement
  soilBagDialog: HTMLDivElement
  accountDialog: HTMLDivElement
}

function createSproutsDialog(): HTMLDivElement {
  const sproutsDialog = document.createElement('div')
  sproutsDialog.className = 'sprouts-dialog hidden'
  sproutsDialog.innerHTML = `
    <div class="sprouts-dialog-box" role="dialog" aria-modal="true" aria-labelledby="sprouts-dialog-title">
      <div class="sprouts-dialog-header">
        <h2 id="sprouts-dialog-title" class="sprouts-dialog-title">All Sprouts</h2>
        <button type="button" class="sprouts-dialog-close" aria-label="Close dialog">×</button>
      </div>
      <div class="sprouts-dialog-content"></div>
    </div>
  `
  return sproutsDialog
}

function createWaterDialog(): HTMLDivElement {
  const waterDialog = document.createElement('div')
  waterDialog.className = 'water-dialog hidden'
  waterDialog.innerHTML = `
    <div class="water-dialog-box" role="dialog" aria-modal="true" aria-labelledby="water-dialog-title">
      <div class="water-dialog-header">
        <h2 id="water-dialog-title" class="water-dialog-title">Water Your Sprouts</h2>
        <button type="button" class="water-dialog-close" aria-label="Close dialog">&times;</button>
      </div>
      <div class="water-dialog-body">
        <!-- Sections are dynamically populated -->
      </div>
    </div>
  `
  return waterDialog
}

function createHarvestDialog(): HTMLDivElement {
  const harvestDialog = document.createElement('div')
  harvestDialog.className = 'harvest-dialog hidden'
  harvestDialog.innerHTML = `
    <div class="harvest-dialog-box" role="dialog" aria-modal="true" aria-labelledby="harvest-dialog-title">
      <div class="harvest-dialog-header">
        <h2 id="harvest-dialog-title" class="harvest-dialog-title">Harvest Sprout</h2>
        <button type="button" class="harvest-dialog-close" aria-label="Close dialog">×</button>
      </div>
      <div class="harvest-dialog-body">
        <p class="harvest-dialog-sprout-title"></p>
        <p class="harvest-dialog-sprout-meta"></p>
        <div class="harvest-dialog-result">
          <label class="harvest-dialog-label">How did it go?</label>
          <div class="harvest-dialog-slider-row">
            <span class="harvest-dialog-slider-label">withered</span>
            <input type="range" min="1" max="5" value="3" class="harvest-dialog-slider" aria-label="Result from 1 (withered) to 5 (flourished)" />
            <span class="harvest-dialog-slider-label">flourished</span>
            <span class="harvest-dialog-result-emoji">🌿</span>
          </div>
          <div class="harvest-dialog-bloom-hints">
            <p class="harvest-dialog-bloom-hint" data-level="1"></p>
            <p class="harvest-dialog-bloom-hint" data-level="3"></p>
            <p class="harvest-dialog-bloom-hint" data-level="5"></p>
          </div>
        </div>
        <textarea class="harvest-dialog-reflection" placeholder="Reflect on what you learned..." maxlength="2000"></textarea>
        <div class="harvest-dialog-actions">
          <button type="button" class="action-btn action-btn-passive action-btn-neutral harvest-dialog-cancel">Cancel</button>
          <button type="button" class="action-btn action-btn-progress action-btn-twig harvest-dialog-save">Harvest</button>
        </div>
      </div>
    </div>
  `
  return harvestDialog
}

function createWaterCanDialog(): HTMLDivElement {
  const waterCanDialog = document.createElement('div')
  waterCanDialog.className = 'water-can-dialog hidden'
  waterCanDialog.innerHTML = `
    <div class="water-can-dialog-box" role="dialog" aria-modal="true" aria-labelledby="water-can-dialog-title">
      <div class="water-can-dialog-header">
        <h2 id="water-can-dialog-title" class="water-can-dialog-title">Watering Can</h2>
        <button type="button" class="water-can-dialog-close" aria-label="Close dialog">×</button>
      </div>
      <div class="water-can-dialog-body">
        <div class="water-can-status-box">
          <p class="water-can-status-text"></p>
          <p class="water-can-status-reset hidden"></p>
        </div>
        <div class="water-can-section water-can-log-section">
          <h3 class="water-can-section-title">Water Log</h3>
          <p class="water-can-empty-log">No water entries yet.</p>
          <div class="water-can-log-entries"></div>
        </div>
      </div>
    </div>
  `
  return waterCanDialog
}

function createSunLogDialog(): HTMLDivElement {
  const sunLogDialog = document.createElement('div')
  sunLogDialog.className = 'sun-log-dialog hidden'
  sunLogDialog.innerHTML = `
    <div class="sun-log-dialog-box" role="dialog" aria-modal="true" aria-labelledby="sun-log-dialog-title">
      <div class="sun-log-dialog-header">
        <h2 id="sun-log-dialog-title" class="sun-log-dialog-title">Sun Ledge</h2>
        <button type="button" class="sun-log-dialog-close" aria-label="Close dialog">×</button>
      </div>
      <div class="sun-log-dialog-body">
        <div class="sun-log-shine-section">
          <div class="sun-log-shine-target">
            <p class="sun-log-shine-title"></p>
            <p class="sun-log-shine-meta"></p>
          </div>
          <textarea class="sun-log-shine-journal" placeholder="Reflect on this journey..." maxlength="2000"></textarea>
          <div class="sun-log-shine-actions">
            <button type="button" class="action-btn action-btn-progress action-btn-sun sun-log-shine-btn">Radiate</button>
          </div>
        </div>
        <div class="sun-log-shine-shone">
          <p class="sun-log-shine-shone-text">✓ Shone this week</p>
          <p class="sun-log-shine-shone-reset"></p>
        </div>
        <h3 class="sun-log-section-title">Past Reflections</h3>
        <p class="sun-log-empty">No entries yet.</p>
        <div class="sun-log-entries"></div>
      </div>
    </div>
  `
  return sunLogDialog
}

function createSoilBagDialog(): HTMLDivElement {
  const soilBagDialog = document.createElement('div')
  soilBagDialog.className = 'soil-bag-dialog hidden'
  soilBagDialog.innerHTML = `
    <div class="soil-bag-dialog-box" role="dialog" aria-modal="true" aria-labelledby="soil-bag-dialog-title">
      <div class="soil-bag-dialog-header">
        <h2 id="soil-bag-dialog-title" class="soil-bag-dialog-title">Soil Bag</h2>
        <button type="button" class="soil-bag-dialog-close" aria-label="Close dialog">×</button>
      </div>
      <div class="soil-bag-dialog-body">
        <p class="soil-bag-empty">No soil activity yet.</p>
        <div class="soil-bag-entries"></div>
      </div>
    </div>
  `
  return soilBagDialog
}

function createAccountDialog(): HTMLDivElement {
  const accountDialog = document.createElement('div')
  accountDialog.className = 'account-dialog hidden'
  accountDialog.innerHTML = `
    <div class="account-dialog-box" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
      <div class="account-dialog-header">
        <h2 id="account-dialog-title" class="account-dialog-title">Account</h2>
        <button type="button" class="account-dialog-close" aria-label="Close dialog">×</button>
      </div>
      <div class="account-dialog-body">
        <div class="account-field">
          <label class="account-label">Email</label>
          <p class="account-email"></p>
        </div>
        <div class="account-field">
          <label class="account-label" for="account-name">Full Name</label>
          <input type="text" id="account-name" class="account-input account-name-input" placeholder="Your name" />
        </div>
        <div class="account-field">
          <label class="account-label" for="account-phone">Phone</label>
          <input type="tel" id="account-phone" class="account-input account-phone-input" placeholder="555 123 4567" />
        </div>
        <div class="account-field">
          <label class="account-label" for="account-timezone">Time Zone</label>
          <select id="account-timezone" class="account-input account-timezone-select"></select>
        </div>
        <div class="account-section-divider"></div>
        <div class="account-tabs">
          <button type="button" class="account-tab is-active" data-tab="notifications">Notifications</button>
          <button type="button" class="account-tab" data-tab="data">Data</button>
        </div>
        <div class="account-tab-panel" data-tab="notifications">
          <div class="account-notifications-section is-disabled">
            <div class="account-field">
              <label class="account-label">Notifications <span class="account-coming-soon">Coming soon</span></label>
            </div>
            <div class="account-field">
              <label class="account-label">Notify Me Via</label>
              <div class="account-radio-group account-channel-group">
                <label class="account-radio"><input type="radio" name="notify-channel" value="email" disabled /><span>Email</span></label>
                <label class="account-radio"><input type="radio" name="notify-channel" value="sms" disabled /><span>Text</span></label>
                <label class="account-radio"><input type="radio" name="notify-channel" value="none" disabled /><span>Off</span></label>
              </div>
            </div>
            <div class="account-field account-notify-options">
              <label class="account-label">Check-in Reminders</label>
              <div class="account-radio-group account-frequency-group">
                <label class="account-radio"><input type="radio" name="notify-frequency" value="daily" disabled /><span>Daily</span></label>
                <label class="account-radio"><input type="radio" name="notify-frequency" value="every3days" disabled /><span>Every 3 days</span></label>
                <label class="account-radio"><input type="radio" name="notify-frequency" value="weekly" disabled /><span>Weekly</span></label>
                <label class="account-radio"><input type="radio" name="notify-frequency" value="off" disabled /><span>Off</span></label>
              </div>
            </div>
            <div class="account-field account-notify-options">
              <label class="account-label">Preferred Time</label>
              <div class="account-radio-group account-time-group">
                <label class="account-radio"><input type="radio" name="notify-time" value="morning" disabled /><span>Morning</span></label>
                <label class="account-radio"><input type="radio" name="notify-time" value="afternoon" disabled /><span>Afternoon</span></label>
                <label class="account-radio"><input type="radio" name="notify-time" value="evening" disabled /><span>Evening</span></label>
              </div>
            </div>
            <div class="account-field account-notify-options">
              <label class="account-label">Event Notifications</label>
              <div class="account-checkbox-group">
                <label class="account-checkbox"><input type="checkbox" class="account-notify-harvest" disabled /><span>Sprout ready to harvest</span></label>
                <label class="account-checkbox"><input type="checkbox" class="account-notify-shine" disabled /><span>Shine available</span></label>
              </div>
            </div>
          </div>
        </div>
        <div class="account-tab-panel hidden" data-tab="data">
          <div class="account-field">
            <label class="account-label">Cloud Sync</label>
            <div class="account-sync-status">
              <span class="sync-status-line">
                <span class="sync-timestamp"></span>
                <span class="sync-state"></span>
              </span>
            </div>
            <p class="account-field-hint">Your data syncs automatically across devices. All activity is stored securely in the cloud.</p>
          </div>
          <div class="account-section-divider"></div>
          <div class="account-field">
            <label class="account-label">Reset All Data</label>
            <p class="account-field-hint">Permanently delete all your sprouts, leaves, and activity. This cannot be undone.</p>
            <button type="button" class="action-btn action-btn-passive action-btn-destructive account-reset-data-btn">Reset All Data</button>
          </div>
        </div>
        <div class="account-actions">
          <button type="button" class="action-btn action-btn-passive action-btn-neutral account-sign-out-btn">Sign Out</button>
          <button type="button" class="action-btn action-btn-progress action-btn-twig account-save-btn">Save</button>
        </div>
      </div>
    </div>
  `
  return accountDialog
}

// REVIEW: Focus trap implemented with manual keydown listener. Alternative: rely solely on
// aria-modal with modern browser support. Manual trap is more reliable cross-browser.
/**
 * Traps focus within a dialog element. Call when opening a dialog.
 * Returns a cleanup function that removes the trap and restores focus
 * to the previously focused element.
 */
export function trapFocus(dialogBox: HTMLElement): () => void {
  // REVIEW: Focus restored to previously focused element on dialog close.
  // Edge case: if original element was removed during dialog, falls back to document.body.
  const previouslyFocused = document.activeElement as HTMLElement | null

  function getFocusableElements(): HTMLElement[] {
    return Array.from(
      dialogBox.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
      ),
    )
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return
    const focusable = getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  dialogBox.addEventListener('keydown', handleKeydown)

  const focusable = getFocusableElements()
  if (focusable.length > 0) {
    focusable[0].focus()
  }

  return () => {
    dialogBox.removeEventListener('keydown', handleKeydown)
    if (previouslyFocused && previouslyFocused.isConnected) {
      previouslyFocused.focus()
    } else {
      document.body.focus()
    }
  }
}

export function buildDialogs(): DialogElements {
  return {
    sproutsDialog: createSproutsDialog(),
    waterDialog: createWaterDialog(),
    harvestDialog: createHarvestDialog(),
    waterCanDialog: createWaterCanDialog(),
    sunLogDialog: createSunLogDialog(),
    soilBagDialog: createSoilBagDialog(),
    accountDialog: createAccountDialog(),
  }
}
