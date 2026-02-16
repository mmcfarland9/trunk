import type { AppElements, BranchGroup } from '../types'
import { BRANCH_COUNT, TWIG_COUNT } from '../constants'
import { syncNode } from './node-ui'
import { getSoilAvailable, getSoilCapacity, getWaterAvailable } from '../state'
import { requireElement } from '../utils/dom-helpers'
import trunkLogo from '../../assets/tree_icon_transp.png'

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
  logo.src = trunkLogo
  logo.alt = 'Trunk logo'

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

  // Sync button (shown next to profile badge when authenticated)
  const syncButton = document.createElement('button')
  syncButton.type = 'button'
  syncButton.className = 'sync-button hidden'
  syncButton.setAttribute('aria-label', 'Sync data')
  syncButton.innerHTML = '<svg class="sync-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>'

  // Wrap badge + sync in a stretch group so sync button matches badge height
  const profileGroup = document.createElement('div')
  profileGroup.className = 'profile-group'
  profileGroup.append(profileBadge, syncButton)

  actions.append(profileGroup)

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
  trunk.style.setProperty('--ampersand', `url(${trunkLogo})`)

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
      <p class="keyboard-hint hint-arrows" title="Cmd+Arrow to cycle"><kbd>⌘←</kbd><kbd>⌘→</kbd> Cycle</p>
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


  // Water journaling dialog (multi-sprout)
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

  shell.append(header, body, sproutsDialog, waterDialog, harvestDialog, waterCanDialog, sunLogDialog, soilBagDialog, accountDialog)
  appRoot.append(shell)

  const elements: AppElements = {
    shell,
    header,
    canvas,
    trunk,
    guideLayer,
    sidePanel,
    focusMeta: requireElement<HTMLParagraphElement>(sidePanel, '.focus-meta', 'focus metadata paragraph'),
    focusTitle: requireElement<HTMLParagraphElement>(sidePanel, '.focus-title', 'focus title paragraph'),
    focusNote: requireElement<HTMLParagraphElement>(sidePanel, '.focus-note', 'focus note paragraph'),
    focusGoal: requireElement<HTMLParagraphElement>(sidePanel, '.focus-goal', 'focus goal paragraph'),
    progressCount: requireElement<HTMLParagraphElement>(sidePanel, '.progress-count', 'progress count paragraph'),
    progressFill: requireElement<HTMLSpanElement>(sidePanel, '.progress-fill', 'progress fill span'),
    backToTrunkButton: requireElement<HTMLButtonElement>(sidePanel, '.back-to-trunk', 'back to trunk button'),
    backToBranchButton: requireElement<HTMLButtonElement>(sidePanel, '.back-to-branch', 'back to branch button'),
    activeSproutsToggle: requireElement<HTMLButtonElement>(sidePanel, '.sprouts-toggle[data-section="active"]', 'active sprouts toggle'),
    activeSproutsList: requireElement<HTMLDivElement>(sidePanel, '.sprouts-list[data-section="active"]', 'active sprouts list'),
    cultivatedSproutsToggle: requireElement<HTMLButtonElement>(sidePanel, '.sprouts-toggle[data-section="cultivated"]', 'cultivated sprouts toggle'),
    cultivatedSproutsList: requireElement<HTMLDivElement>(sidePanel, '.sprouts-list[data-section="cultivated"]', 'cultivated sprouts list'),
    profileBadge,
    profileEmail,
    syncButton,
    syncTimestamp: requireElement<HTMLSpanElement>(accountDialog, '.sync-timestamp', 'sync timestamp span'),
    syncState: requireElement<HTMLSpanElement>(accountDialog, '.sync-state', 'sync state span'),
    sproutsDialog,
    sproutsDialogContent: requireElement<HTMLDivElement>(sproutsDialog, '.sprouts-dialog-content', 'sprouts dialog content'),
    sproutsDialogClose: requireElement<HTMLButtonElement>(sproutsDialog, '.sprouts-dialog-close', 'sprouts dialog close button'),
    waterDialog,
    waterDialogClose: requireElement<HTMLButtonElement>(waterDialog, '.water-dialog-close', 'water dialog close button'),
    waterDialogBody: requireElement<HTMLDivElement>(waterDialog, '.water-dialog-body', 'water dialog body'),
    harvestDialog,
    harvestDialogTitle: requireElement<HTMLParagraphElement>(harvestDialog, '.harvest-dialog-sprout-title', 'harvest dialog sprout title'),
    harvestDialogMeta: requireElement<HTMLParagraphElement>(harvestDialog, '.harvest-dialog-sprout-meta', 'harvest dialog sprout meta'),
    harvestDialogSlider: requireElement<HTMLInputElement>(harvestDialog, '.harvest-dialog-slider', 'harvest dialog slider'),
    harvestDialogResultEmoji: requireElement<HTMLSpanElement>(harvestDialog, '.harvest-dialog-result-emoji', 'harvest dialog result emoji'),
    harvestDialogBloomHints: harvestDialog.querySelectorAll<HTMLParagraphElement>('.harvest-dialog-bloom-hint'),
    harvestDialogReflection: requireElement<HTMLTextAreaElement>(harvestDialog, '.harvest-dialog-reflection', 'harvest dialog reflection textarea'),
    harvestDialogClose: requireElement<HTMLButtonElement>(harvestDialog, '.harvest-dialog-close', 'harvest dialog close button'),
    harvestDialogCancel: requireElement<HTMLButtonElement>(harvestDialog, '.harvest-dialog-cancel', 'harvest dialog cancel button'),
    harvestDialogSave: requireElement<HTMLButtonElement>(harvestDialog, '.harvest-dialog-save', 'harvest dialog save button'),
    soilMeterFill: soilFill,
    soilMeterValue: soilValue,
    waterCircles,
    sunCircle,
    waterCanDialog,
    waterCanDialogClose: requireElement<HTMLButtonElement>(waterCanDialog, '.water-can-dialog-close', 'water can dialog close button'),
    waterCanStatusText: requireElement<HTMLParagraphElement>(waterCanDialog, '.water-can-status-text', 'water can status text'),
    waterCanStatusReset: requireElement<HTMLParagraphElement>(waterCanDialog, '.water-can-status-reset', 'water can status reset text'),
    waterCanEmptyLog: requireElement<HTMLParagraphElement>(waterCanDialog, '.water-can-empty-log', 'water can empty log text'),
    waterCanLogEntries: requireElement<HTMLDivElement>(waterCanDialog, '.water-can-log-entries', 'water can log entries container'),
    waterMeter,
    sunLogDialog,
    sunLogDialogClose: requireElement<HTMLButtonElement>(sunLogDialog, '.sun-log-dialog-close', 'sun log dialog close button'),
    sunLogShineSection: requireElement<HTMLDivElement>(sunLogDialog, '.sun-log-shine-section', 'sun log shine section'),
    sunLogShineTitle: requireElement<HTMLParagraphElement>(sunLogDialog, '.sun-log-shine-title', 'sun log shine title'),
    sunLogShineMeta: requireElement<HTMLParagraphElement>(sunLogDialog, '.sun-log-shine-meta', 'sun log shine meta'),
    sunLogShineJournal: requireElement<HTMLTextAreaElement>(sunLogDialog, '.sun-log-shine-journal', 'sun log shine journal textarea'),
    sunLogShineBtn: requireElement<HTMLButtonElement>(sunLogDialog, '.sun-log-shine-btn', 'sun log shine button'),
    sunLogShineShone: requireElement<HTMLDivElement>(sunLogDialog, '.sun-log-shine-shone', 'sun log shine shone indicator'),
    sunLogShineShoneReset: requireElement<HTMLParagraphElement>(sunLogDialog, '.sun-log-shine-shone-reset', 'sun log shine shone reset text'),
    sunLogDialogEmpty: requireElement<HTMLParagraphElement>(sunLogDialog, '.sun-log-empty', 'sun log empty state text'),
    sunLogDialogEntries: requireElement<HTMLDivElement>(sunLogDialog, '.sun-log-entries', 'sun log entries container'),
    sunMeter,
    soilBagDialog,
    soilBagDialogClose: requireElement<HTMLButtonElement>(soilBagDialog, '.soil-bag-dialog-close', 'soil bag dialog close button'),
    soilBagDialogEmpty: requireElement<HTMLParagraphElement>(soilBagDialog, '.soil-bag-empty', 'soil bag empty state text'),
    soilBagDialogEntries: requireElement<HTMLDivElement>(soilBagDialog, '.soil-bag-entries', 'soil bag entries container'),
    soilMeter,
    accountDialog,
    accountDialogClose: requireElement<HTMLButtonElement>(accountDialog, '.account-dialog-close', 'account dialog close button'),
    accountDialogEmail: requireElement<HTMLParagraphElement>(accountDialog, '.account-email', 'account dialog email'),
    accountDialogNameInput: requireElement<HTMLInputElement>(accountDialog, '.account-name-input', 'account dialog name input'),
    accountDialogPhoneInput: requireElement<HTMLInputElement>(accountDialog, '.account-phone-input', 'account dialog phone input'),
    accountDialogTimezoneSelect: requireElement<HTMLSelectElement>(accountDialog, '.account-timezone-select', 'account dialog timezone select'),
    accountDialogChannelInputs: accountDialog.querySelectorAll<HTMLInputElement>('input[name="notify-channel"]'),
    accountDialogFrequencyInputs: accountDialog.querySelectorAll<HTMLInputElement>('input[name="notify-frequency"]'),
    accountDialogTimeInputs: accountDialog.querySelectorAll<HTMLInputElement>('input[name="notify-time"]'),
    accountDialogHarvestCheckbox: requireElement<HTMLInputElement>(accountDialog, '.account-notify-harvest', 'account dialog harvest notification checkbox'),
    accountDialogShineCheckbox: requireElement<HTMLInputElement>(accountDialog, '.account-notify-shine', 'account dialog shine notification checkbox'),
    accountDialogSignOut: requireElement<HTMLButtonElement>(accountDialog, '.account-sign-out-btn', 'account dialog sign out button'),
    accountDialogSave: requireElement<HTMLButtonElement>(accountDialog, '.account-save-btn', 'account dialog save button'),
    accountDialogResetData: requireElement<HTMLButtonElement>(accountDialog, '.account-reset-data-btn', 'account dialog reset data button'),
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
