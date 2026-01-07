import type { AppElements, BranchGroup } from '../types'
import { BRANCH_COUNT, TWIG_COUNT } from '../constants'
import { syncNode } from './node-ui'
import ampersandImage from '../../assets/ampersand_alpha.png'

export type DomBuilderResult = {
  elements: AppElements
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
}

export type NodeClickHandler = (
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

  const settingsButton = document.createElement('button')
  settingsButton.type = 'button'
  settingsButton.className = 'action-button'
  settingsButton.textContent = 'Settings'

  const importButton = document.createElement('button')
  importButton.type = 'button'
  importButton.className = 'action-button'
  importButton.textContent = 'Import'

  const exportButton = document.createElement('button')
  exportButton.type = 'button'
  exportButton.className = 'action-button'
  exportButton.textContent = 'Export'

  const resetButton = document.createElement('button')
  resetButton.type = 'button'
  resetButton.className = 'action-button secondary'
  resetButton.textContent = 'Reset map'

  const resetHistoryButton = document.createElement('button')
  resetHistoryButton.type = 'button'
  resetHistoryButton.className = 'action-button secondary'
  resetHistoryButton.textContent = 'Reset all history'

  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = 'application/json'
  importInput.className = 'visually-hidden'

  importButton.addEventListener('click', () => importInput.click())

  actions.append(settingsButton, importButton, exportButton, resetButton, resetHistoryButton)
  header.append(actions, logo, importInput)

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

  // Debug checkbox
  const debugLabel = document.createElement('label')
  debugLabel.className = 'debug-toggle'
  const debugCheckbox = document.createElement('input')
  debugCheckbox.type = 'checkbox'
  debugCheckbox.checked = false
  const debugText = document.createTextNode(' Show debug guide lines')
  debugLabel.append(debugCheckbox, debugText)

  mapPanel.append(canvas, guideLayer, debugLabel)

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
      <div class="progress-actions">
        <button type="button" class="panel-button back-to-trunk">← Back to trunk</button>
      </div>
      <div class="branch-progress"></div>
    </section>
    <section class="panel-section">
      <p class="status-message"></p>
      <p class="status-meta"></p>
    </section>
  `

  body.append(mapPanel, sidePanel)
  shell.append(header, body)
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
    branchProgress: sidePanel.querySelector<HTMLDivElement>('.branch-progress')!,
    statusMessage: sidePanel.querySelector<HTMLParagraphElement>('.status-message')!,
    statusMeta: sidePanel.querySelector<HTMLParagraphElement>('.status-meta')!,
    importInput,
    debugCheckbox,
  }

  // Wire up button handlers (will be connected to features in main.ts)
  settingsButton.dataset.action = 'settings'
  exportButton.dataset.action = 'export'
  resetButton.dataset.action = 'reset'
  resetHistoryButton.dataset.action = 'reset-history'

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

export function getActionButtons(shell: HTMLDivElement): {
  settingsButton: HTMLButtonElement
  exportButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  resetHistoryButton: HTMLButtonElement
} {
  return {
    settingsButton: shell.querySelector<HTMLButtonElement>('[data-action="settings"]')!,
    exportButton: shell.querySelector<HTMLButtonElement>('[data-action="export"]')!,
    resetButton: shell.querySelector<HTMLButtonElement>('[data-action="reset"]')!,
    resetHistoryButton: shell.querySelector<HTMLButtonElement>('[data-action="reset-history"]')!,
  }
}
