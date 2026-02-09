import type { AppElements, BranchGroup } from '../types'
import { BRANCH_COUNT, TWIG_COUNT } from '../constants'
import { syncNode } from './node-ui'
import { getSoilAvailable, getSoilCapacity, getWaterAvailable } from '../state'
import ampersandImage from '../../assets/ampersand_alpha.png'

type DomBuilderResult = {
  elements: AppElements
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
}

type NodeClickHandler = (
  element: HTMLButtonElement,
  nodeId: string,
  placeholder: string
) => void

export function buildApp(
  appRoot: HTMLDivElement,
  onNodeClick: NodeClickHandler
): DomBuilderResult {
  const allNodes: HTMLButtonElement[] = []
  const branchGroups: BranchGroup[] = []
  const nodeLookup = new Map<string, HTMLButtonElement>()

  // Shell
  const shell = document.createElement('div')
  shell.className = 'app-shell'

  // Header
  const header = document.createElement('header')
  header.className = 'app-header'

  const actions = document.createElement('div')
  actions.className = 'app-actions'

  const logo = document.createElement('img')
  logo.className = 'header-logo'
  logo.src = ampersandImage
  logo.alt = 'Trunk mark'

  // Profile badge (shown when authenticated)
  const profileBadge = document.createElement('div')
  profileBadge.className = 'profile-badge hidden'

  const profileIcon = document.createElement('span')
  profileIcon.className = 'profile-icon'
  profileIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z"/></svg>'

  const profileEmail = document.createElement('span')
  profileEmail.className = 'profile-email'
  profileEmail.textContent = ''

  profileBadge.append(profileIcon, profileEmail)
  actions.append(profileBadge)

  // Global Soil meter
  const soilMeter = document.createElement('div')
  soilMeter.className = 'resource-meter soil-meter'

  const soilLabel = document.createElement('span')
  soilLabel.className = 'resource-meter-label'
  soilLabel.textContent = 'Soil:'

  const soilTrack = document.createElement('div')
  soilTrack.className = 'resource-meter-track'

  const soilFill = document.createElement('div')
  soilFill.className = 'resource-meter-fill'
  const initialAvailable = getSoilAvailable()
  const initialCapacity = getSoilCapacity()
  soilFill.style.width = `${(initialAvailable / initialCapacity) * 100}%`

  const soilValue = document.createElement('span')
  soilValue.className = 'resource-meter-value'
  soilValue.textContent = `${initialAvailable.toFixed(2)}/${initialCapacity.toFixed(2)}`

  soilTrack.append(soilFill)
  soilMeter.append(soilLabel, soilTrack, soilValue)

  // Global Water meter - 3 circles
  const waterMeter = document.createElement('div')
  waterMeter.className = 'resource-meter water-meter'

  const waterLabel = document.createElement('span')
  waterLabel.className = 'resource-meter-label'
  waterLabel.textContent = 'Water:'

  const waterTrack = document.createElement('div')
  waterTrack.className = 'resource-meter-track resource-circles'

  const initialWaterAvailable = getWaterAvailable()
  const waterCircles: HTMLSpanElement[] = []
  for (let i = 0; i < 3; i++) {
    const circle = document.createElement('span')
    circle.className = 'resource-circle water-circle'
    if (i < initialWaterAvailable) {
      circle.classList.add('is-filled')
    }
    waterCircles.push(circle)
    waterTrack.append(circle)
  }

  waterMeter.append(waterLabel, waterTrack)

  // Global Sun meter - 1 circle
  const sunMeter = document.createElement('div')
  sunMeter.className = 'resource-meter sun-meter'

  const sunLabel = document.createElement('span')
  sunLabel.className = 'resource-meter-label'
  sunLabel.textContent = 'Sun:'

  const sunTrack = document.createElement('div')
  sunTrack.className = 'resource-meter-track resource-circles'

  const sunCircle = document.createElement('span')
  sunCircle.className = 'resource-circle sun-circle is-filled'
  sunTrack.append(sunCircle)

  sunMeter.append(sunLabel, sunTrack)

  // Meter group for visual cohesion
  const meterGroup = document.createElement('div')
  meterGroup.className = 'meter-group'
  meterGroup.append(soilMeter, waterMeter, sunMeter)

  header.append(actions, meterGroup, logo)

  // Body
  const body = document.createElement('div')
  body.className = 'app-body'

  // Map Panel
  const mapPanel = document.createElement('section')
  mapPanel.className = 'map-panel'

  const canvas = document.createElement('div')
  canvas.className = 'canvas'

  // Guide layer is OUTSIDE canvas to avoid transform issues
  const guideLayer = document.createElement('div')
  guideLayer.className = 'guide-layer'

  // Trunk
  const trunk = document.createElement('button')
  trunk.type = 'button'
  trunk.className = 'node trunk'
  trunk.dataset.nodeId = 'trunk'
  trunk.dataset.defaultLabel = 'Trunk'
  trunk.dataset.placeholder = 'Trunk'
  trunk.setAttribute('aria-label', 'Trunk - your core purpose')
  trunk.style.setProperty('--ampersand', `url(${ampersandImage})`)

  const trunkLabel = document.createElement('span')
  trunkLabel.className = 'trunk-title node-label'
  trunkLabel.textContent = 'Trunk'
  trunk.append(trunkLabel)

  canvas.append(trunk)

  initializeNode(trunk, 'Trunk', nodeLookup, onNodeClick)
  allNodes.push(trunk)

  // Create branches
  for (let i = 0; i < BRANCH_COUNT; i += 1) {
    const wrapper = document.createElement('div')
    wrapper.className = 'branch-group'

    const branchId = `branch-${i}`
    const branch = document.createElement('button')
    branch.type = 'button'
    branch.className = 'node branch'
    branch.dataset.nodeId = branchId
    branch.dataset.defaultLabel = String(i + 1)
    branch.dataset.placeholder = `Branch ${i + 1}`
    branch.dataset.branchIndex = String(i)
    branch.setAttribute('aria-label', `Branch ${i + 1}`)

    const branchLabel = document.createElement('span')
    branchLabel.className = 'node-label'
    branch.append(branchLabel)

    const keyHint = document.createElement('span')
    keyHint.className = 'key-hint'
    keyHint.textContent = String(i + 1)
    branch.append(keyHint)

    initializeNode(branch, `Branch ${i + 1}`, nodeLookup, onNodeClick)
    allNodes.push(branch)

    const twigs: HTMLButtonElement[] = []
    for (let j = 0; j < TWIG_COUNT; j += 1) {
      const twigId = `branch-${i}-twig-${j}`
      const twig = document.createElement('button')
      twig.type = 'button'
      twig.className = 'node twig'
      twig.dataset.nodeId = twigId
      twig.dataset.defaultLabel = ''
      twig.dataset.placeholder = `Twig ${j + 1} for branch ${i + 1}`
      twig.dataset.branchIndex = String(i)
      twig.dataset.twigIndex = String(j)
      twig.dataset.twigStyle = '0'
      twig.style.setProperty('--twig-delay', `${getBloomDelay(j)}ms`)
      twig.setAttribute('aria-label', `Twig ${j + 1} for branch ${i + 1}`)

      const twigLabel = document.createElement('span')
      twigLabel.className = 'node-label'
      twig.append(twigLabel)

      const twigKeyHint = document.createElement('span')
      twigKeyHint.className = 'key-hint'
      twigKeyHint.textContent = String(j + 1)
      twig.append(twigKeyHint)

      initializeNode(twig, `Twig ${j + 1} for branch ${i + 1}`, nodeLookup, onNodeClick)
      twigs.push(twig)
      allNodes.push(twig)
      wrapper.append(twig)
    }

    wrapper.append(branch)
    branchGroups.push({ group: wrapper, branch, twigs })
    canvas.append(wrapper)
  }

  mapPanel.append(canvas, guideLayer)

  // Side Panel
  const sidePanel = document.createElement('aside')
  sidePanel.className = 'side-panel'
  sidePanel.innerHTML = `
    <section class="panel-section focus-section">
      <p class="focus-meta"></p>
      <p class="focus-title"></p>
      <p class="focus-note"></p>
      <p class="focus-goal"></p>
    </section>
    <section class="panel-section progress-section">
      <p class="progress-count"></p>
      <div class="progress-track">
        <span class="progress-fill" style="width: 0%"></span>
      </div>
    </section>
    <section class="panel-section sprouts-section">
      <button type="button" class="panel-button back-to-trunk">← Back to trunk</button>
      <button type="button" class="panel-button back-to-branch">← Back to branch</button>
      <button type="button" class="sprouts-toggle is-expanded" data-section="active">
        <span class="sprouts-toggle-arrow">▼</span>
        <span class="sprouts-toggle-label">Growing</span>
        <span class="sprouts-toggle-count">(0)</span>
      </button>
      <div class="sprouts-list" data-section="active"></div>
      <button type="button" class="sprouts-toggle" data-section="cultivated">
        <span class="sprouts-toggle-arrow">▼</span>
        <span class="sprouts-toggle-label">Cultivated</span>
        <span class="sprouts-toggle-count">(0)</span>
      </button>
      <div class="sprouts-list" data-section="cultivated"></div>
    </section>
    <section class="panel-section keyboard-hints">
      <p class="keyboard-hint hint-escape" title="Press Escape to go back"><kbd>Esc</kbd> Back</p>
      <p class="keyboard-hint hint-arrows" title="Arrow keys to cycle branches"><kbd>←</kbd><kbd>→</kbd> Cycle</p>
      <p class="keyboard-hint hint-numbers" title="Number keys to select"><kbd>1-8</kbd> Select</p>
    </section>
  `

  body.append(mapPanel, sidePanel)

  // Sprouts dialog
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


  // Water journaling dialog
  const waterDialog = document.createElement('div')
  waterDialog.className = 'water-dialog hidden'
  waterDialog.innerHTML = `
    <div class="water-dialog-box" role="dialog" aria-modal="true" aria-labelledby="water-dialog-title">
      <div class="water-dialog-header">
        <h2 id="water-dialog-title" class="water-dialog-title">Water Sprout</h2>
        <button type="button" class="water-dialog-close" aria-label="Close dialog">×</button>
      </div>
      <div class="water-dialog-body">
        <p class="water-dialog-sprout-title"></p>
        <p class="water-dialog-sprout-meta"></p>
        <textarea class="water-dialog-journal" placeholder="How is this sprout growing? Reflect on your progress..."></textarea>
        <div class="water-dialog-actions">
          <button type="button" class="action-btn action-btn-passive action-btn-neutral water-dialog-cancel">Cancel</button>
          <button type="button" class="action-btn action-btn-progress action-btn-water water-dialog-save">Pour</button>
        </div>
      </div>
    </div>
  `

  // Harvest dialog
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
        <textarea class="harvest-dialog-reflection" placeholder="Reflect on what you learned..."></textarea>
        <div class="harvest-dialog-actions">
          <button type="button" class="action-btn action-btn-passive action-btn-neutral harvest-dialog-cancel">Cancel</button>
          <button type="button" class="action-btn action-btn-progress action-btn-twig harvest-dialog-save">Harvest</button>
        </div>
      </div>
    </div>
  `

  // Water Can dialog - status box + water log
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

  // Sun Log dialog - view all shine journal entries + shine input at top
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
          <textarea class="sun-log-shine-journal" placeholder="Reflect on this journey..."></textarea>
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

  // Soil Bag dialog - view soil gains and losses
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

  // Account dialog - user profile with tabs for Notifications and Data
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
              <span class="sync-indicator" data-status="idle">
                <svg class="sync-cloud" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                </svg>
                <span class="sync-dot"></span>
              </span>
              <span class="account-sync-text">Synced</span>
            </div>
            <p class="account-field-hint">Your data syncs automatically across devices. All activity is stored securely in the cloud.</p>
            <button type="button" class="action-btn action-btn-passive action-btn-neutral account-force-sync-btn">Force Full Sync</button>
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

  shell.append(header, body, sproutsDialog, waterDialog, harvestDialog, waterCanDialog, sunLogDialog, soilBagDialog, accountDialog)
  appRoot.append(shell)

  const elements: AppElements = {
    shell,
    header,
    canvas,
    trunk,
    guideLayer,
    sidePanel,
    focusMeta: sidePanel.querySelector<HTMLParagraphElement>('.focus-meta')!,
    focusTitle: sidePanel.querySelector<HTMLParagraphElement>('.focus-title')!,
    focusNote: sidePanel.querySelector<HTMLParagraphElement>('.focus-note')!,
    focusGoal: sidePanel.querySelector<HTMLParagraphElement>('.focus-goal')!,
    progressCount: sidePanel.querySelector<HTMLParagraphElement>('.progress-count')!,
    progressFill: sidePanel.querySelector<HTMLSpanElement>('.progress-fill')!,
    backToTrunkButton: sidePanel.querySelector<HTMLButtonElement>('.back-to-trunk')!,
    backToBranchButton: sidePanel.querySelector<HTMLButtonElement>('.back-to-branch')!,
    activeSproutsToggle: sidePanel.querySelector<HTMLButtonElement>('.sprouts-toggle[data-section="active"]')!,
    activeSproutsList: sidePanel.querySelector<HTMLDivElement>('.sprouts-list[data-section="active"]')!,
    cultivatedSproutsToggle: sidePanel.querySelector<HTMLButtonElement>('.sprouts-toggle[data-section="cultivated"]')!,
    cultivatedSproutsList: sidePanel.querySelector<HTMLDivElement>('.sprouts-list[data-section="cultivated"]')!,
    profileBadge,
    profileEmail,
    syncIndicator: accountDialog.querySelector<HTMLSpanElement>('.sync-indicator')!,
    syncText: accountDialog.querySelector<HTMLSpanElement>('.account-sync-text')!,
    sproutsDialog,
    sproutsDialogContent: sproutsDialog.querySelector<HTMLDivElement>('.sprouts-dialog-content')!,
    sproutsDialogClose: sproutsDialog.querySelector<HTMLButtonElement>('.sprouts-dialog-close')!,
    waterDialog,
    waterDialogTitle: waterDialog.querySelector<HTMLParagraphElement>('.water-dialog-sprout-title')!,
    waterDialogMeta: waterDialog.querySelector<HTMLParagraphElement>('.water-dialog-sprout-meta')!,
    waterDialogJournal: waterDialog.querySelector<HTMLTextAreaElement>('.water-dialog-journal')!,
    waterDialogClose: waterDialog.querySelector<HTMLButtonElement>('.water-dialog-close')!,
    waterDialogCancel: waterDialog.querySelector<HTMLButtonElement>('.water-dialog-cancel')!,
    waterDialogSave: waterDialog.querySelector<HTMLButtonElement>('.water-dialog-save')!,
    harvestDialog,
    harvestDialogTitle: harvestDialog.querySelector<HTMLParagraphElement>('.harvest-dialog-sprout-title')!,
    harvestDialogMeta: harvestDialog.querySelector<HTMLParagraphElement>('.harvest-dialog-sprout-meta')!,
    harvestDialogSlider: harvestDialog.querySelector<HTMLInputElement>('.harvest-dialog-slider')!,
    harvestDialogResultEmoji: harvestDialog.querySelector<HTMLSpanElement>('.harvest-dialog-result-emoji')!,
    harvestDialogBloomHints: harvestDialog.querySelectorAll<HTMLParagraphElement>('.harvest-dialog-bloom-hint'),
    harvestDialogReflection: harvestDialog.querySelector<HTMLTextAreaElement>('.harvest-dialog-reflection')!,
    harvestDialogClose: harvestDialog.querySelector<HTMLButtonElement>('.harvest-dialog-close')!,
    harvestDialogCancel: harvestDialog.querySelector<HTMLButtonElement>('.harvest-dialog-cancel')!,
    harvestDialogSave: harvestDialog.querySelector<HTMLButtonElement>('.harvest-dialog-save')!,
    soilMeterFill: soilFill,
    soilMeterValue: soilValue,
    waterCircles,
    sunCircle,
    waterCanDialog,
    waterCanDialogClose: waterCanDialog.querySelector<HTMLButtonElement>('.water-can-dialog-close')!,
    waterCanStatusText: waterCanDialog.querySelector<HTMLParagraphElement>('.water-can-status-text')!,
    waterCanStatusReset: waterCanDialog.querySelector<HTMLParagraphElement>('.water-can-status-reset')!,
    waterCanEmptyLog: waterCanDialog.querySelector<HTMLParagraphElement>('.water-can-empty-log')!,
    waterCanLogEntries: waterCanDialog.querySelector<HTMLDivElement>('.water-can-log-entries')!,
    waterMeter,
    sunLogDialog,
    sunLogDialogClose: sunLogDialog.querySelector<HTMLButtonElement>('.sun-log-dialog-close')!,
    sunLogShineSection: sunLogDialog.querySelector<HTMLDivElement>('.sun-log-shine-section')!,
    sunLogShineTitle: sunLogDialog.querySelector<HTMLParagraphElement>('.sun-log-shine-title')!,
    sunLogShineMeta: sunLogDialog.querySelector<HTMLParagraphElement>('.sun-log-shine-meta')!,
    sunLogShineJournal: sunLogDialog.querySelector<HTMLTextAreaElement>('.sun-log-shine-journal')!,
    sunLogShineBtn: sunLogDialog.querySelector<HTMLButtonElement>('.sun-log-shine-btn')!,
    sunLogShineShone: sunLogDialog.querySelector<HTMLDivElement>('.sun-log-shine-shone')!,
    sunLogShineShoneReset: sunLogDialog.querySelector<HTMLParagraphElement>('.sun-log-shine-shone-reset')!,
    sunLogDialogEmpty: sunLogDialog.querySelector<HTMLParagraphElement>('.sun-log-empty')!,
    sunLogDialogEntries: sunLogDialog.querySelector<HTMLDivElement>('.sun-log-entries')!,
    sunMeter,
    soilBagDialog,
    soilBagDialogClose: soilBagDialog.querySelector<HTMLButtonElement>('.soil-bag-dialog-close')!,
    soilBagDialogEmpty: soilBagDialog.querySelector<HTMLParagraphElement>('.soil-bag-empty')!,
    soilBagDialogEntries: soilBagDialog.querySelector<HTMLDivElement>('.soil-bag-entries')!,
    soilMeter,
    accountDialog,
    accountDialogClose: accountDialog.querySelector<HTMLButtonElement>('.account-dialog-close')!,
    accountDialogEmail: accountDialog.querySelector<HTMLParagraphElement>('.account-email')!,
    accountDialogNameInput: accountDialog.querySelector<HTMLInputElement>('.account-name-input')!,
    accountDialogPhoneInput: accountDialog.querySelector<HTMLInputElement>('.account-phone-input')!,
    accountDialogTimezoneSelect: accountDialog.querySelector<HTMLSelectElement>('.account-timezone-select')!,
    accountDialogChannelInputs: accountDialog.querySelectorAll<HTMLInputElement>('input[name="notify-channel"]'),
    accountDialogFrequencyInputs: accountDialog.querySelectorAll<HTMLInputElement>('input[name="notify-frequency"]'),
    accountDialogTimeInputs: accountDialog.querySelectorAll<HTMLInputElement>('input[name="notify-time"]'),
    accountDialogHarvestCheckbox: accountDialog.querySelector<HTMLInputElement>('.account-notify-harvest')!,
    accountDialogShineCheckbox: accountDialog.querySelector<HTMLInputElement>('.account-notify-shine')!,
    accountDialogSignOut: accountDialog.querySelector<HTMLButtonElement>('.account-sign-out-btn')!,
    accountDialogSave: accountDialog.querySelector<HTMLButtonElement>('.account-save-btn')!,
    accountDialogResetData: accountDialog.querySelector<HTMLButtonElement>('.account-reset-data-btn')!,
    accountDialogForceSync: accountDialog.querySelector<HTMLButtonElement>('.account-force-sync-btn')!,
  }

  return {
    elements,
    branchGroups,
    allNodes,
    nodeLookup,
  }
}

function initializeNode(
  element: HTMLButtonElement,
  placeholder: string,
  nodeLookup: Map<string, HTMLButtonElement>,
  onNodeClick: NodeClickHandler
): void {
  const nodeId = element.dataset.nodeId
  if (nodeId) {
    nodeLookup.set(nodeId, element)
  }
  element.dataset.placeholder = placeholder
  syncNode(element)

  element.addEventListener('click', (event) => {
    event.stopPropagation()
    if (nodeId) {
      onNodeClick(element, nodeId, placeholder)
    }
  })
}

function getBloomDelay(twigIndex: number): number {
  const baseDelay = 60
  const delayStep = 40
  const distanceFromFront = Math.min(twigIndex, TWIG_COUNT - twigIndex)
  return baseDelay + distanceFromFront * delayStep
}

// Action buttons removed - settings hidden for now
