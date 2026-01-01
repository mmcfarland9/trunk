import type { AppElements, BranchGroup } from '../types'
import { BRANCH_COUNT, LEAF_COUNT } from '../constants'
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
  logo.alt = 'Harada mark'

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

  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = 'application/json'
  importInput.className = 'visually-hidden'

  importButton.addEventListener('click', () => importInput.click())

  actions.append(importButton, exportButton, resetButton)
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
  trunk.dataset.defaultLabel = 'Purpose'
  trunk.dataset.placeholder = 'Purpose'
  trunk.setAttribute('aria-label', 'Trunk - your core purpose')
  trunk.style.setProperty('--ampersand', `url(${ampersandImage})`)

  const trunkLabel = document.createElement('span')
  trunkLabel.className = 'trunk-title node-label'
  trunkLabel.textContent = 'Purpose'
  trunk.append(trunkLabel)

  canvas.append(trunk)

  initializeNode(trunk, 'Purpose', nodeLookup, onNodeClick)
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

    initializeNode(branch, `Branch ${i + 1}`, nodeLookup, onNodeClick)
    allNodes.push(branch)

    const leaves: HTMLButtonElement[] = []
    for (let j = 0; j < LEAF_COUNT; j += 1) {
      const leafId = `branch-${i}-sub-${j}`
      const leaf = document.createElement('button')
      leaf.type = 'button'
      leaf.className = 'node leaf'
      leaf.dataset.nodeId = leafId
      leaf.dataset.defaultLabel = ''
      leaf.dataset.placeholder = `Leaf ${j + 1} for branch ${i + 1}`
      leaf.dataset.branchIndex = String(i)
      leaf.dataset.leafIndex = String(j)
      leaf.style.setProperty('--leaf-delay', `${getBloomDelay(j)}ms`)
      leaf.setAttribute('aria-label', `Leaf ${j + 1} for branch ${i + 1}`)

      initializeNode(leaf, `Leaf ${j + 1} for branch ${i + 1}`, nodeLookup, onNodeClick)
      leaves.push(leaf)
      allNodes.push(leaf)
      wrapper.append(leaf)
    }

    wrapper.append(branch)
    branchGroups.push({ group: wrapper, branch, leaves })
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
    </section>
    <section class="panel-section">
      <p class="progress-count"></p>
      <div class="progress-track">
        <span class="progress-fill" style="width: 0%"></span>
      </div>
      <div class="progress-actions">
        <button type="button" class="panel-button next-open">Next open</button>
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
    progressCount: sidePanel.querySelector<HTMLParagraphElement>('.progress-count')!,
    progressFill: sidePanel.querySelector<HTMLSpanElement>('.progress-fill')!,
    nextButton: sidePanel.querySelector<HTMLButtonElement>('.next-open')!,
    branchProgress: sidePanel.querySelector<HTMLDivElement>('.branch-progress')!,
    statusMessage: sidePanel.querySelector<HTMLParagraphElement>('.status-message')!,
    statusMeta: sidePanel.querySelector<HTMLParagraphElement>('.status-meta')!,
    importInput,
    debugCheckbox,
  }

  // Wire up button handlers (will be connected to features in main.ts)
  exportButton.dataset.action = 'export'
  resetButton.dataset.action = 'reset'

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

function getBloomDelay(leafIndex: number): number {
  const baseDelay = 60
  const delayStep = 40
  const distanceFromFront = Math.min(leafIndex, LEAF_COUNT - leafIndex)
  return baseDelay + distanceFromFront * delayStep
}

export function getActionButtons(shell: HTMLDivElement): {
  exportButton: HTMLButtonElement
  resetButton: HTMLButtonElement
} {
  return {
    exportButton: shell.querySelector<HTMLButtonElement>('[data-action="export"]')!,
    resetButton: shell.querySelector<HTMLButtonElement>('[data-action="reset"]')!,
  }
}
