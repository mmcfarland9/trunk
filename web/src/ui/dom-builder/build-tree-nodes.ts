import type { BranchGroup } from '../../types'
import { BRANCH_COUNT, TWIG_COUNT } from '../../constants'
import { syncNode } from '../node-ui'
import { getPresetLabel } from '../../state'
import { getState } from '../../events'
import trunkLogo from '../../../assets/tree_icon_transp.png'

type NodeClickHandler = (element: HTMLButtonElement, nodeId: string) => void

export type TreeNodesElements = {
  mapPanel: HTMLElement
  canvas: HTMLDivElement
  guideLayer: HTMLCanvasElement
  trunk: HTMLButtonElement
  branchGroups: BranchGroup[]
  allNodes: HTMLButtonElement[]
  nodeLookup: Map<string, HTMLButtonElement>
  tooltip: HTMLDivElement
}

function initializeNode(
  element: HTMLButtonElement,
  placeholder: string,
  nodeLookup: Map<string, HTMLButtonElement>,
  onNodeClick: NodeClickHandler,
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
      onNodeClick(element, nodeId)
    }
  })
}

function getBloomDelay(twigIndex: number): number {
  const baseDelay = 60
  const delayStep = 40
  const distanceFromFront = Math.min(twigIndex, TWIG_COUNT - twigIndex)
  return baseDelay + distanceFromFront * delayStep
}

function getTooltipText(element: HTMLButtonElement): string {
  const nodeId = element.dataset.nodeId
  if (!nodeId) return ''

  const state = getState()

  if (element.classList.contains('trunk')) {
    let total = 0
    for (const sprouts of state.activeSproutsByTwig.values()) {
      total += sprouts.length
    }
    return `${total} active sprout${total === 1 ? '' : 's'}`
  }

  if (element.classList.contains('branch')) {
    const label = getPresetLabel(nodeId)
    const branchIndex = element.dataset.branchIndex
    let count = 0
    if (branchIndex !== undefined) {
      for (let j = 0; j < TWIG_COUNT; j += 1) {
        const twigId = `branch-${branchIndex}-twig-${j}`
        count += state.activeSproutsByTwig.get(twigId)?.length ?? 0
      }
    }
    return `${label} — ${count} active`
  }

  if (element.classList.contains('twig')) {
    const label = getPresetLabel(nodeId)
    const sprouts = state.sproutsByTwig.get(nodeId) ?? []
    const active = state.activeSproutsByTwig.get(nodeId) ?? []
    if (label) {
      return `${label} — ${active.length} active, ${sprouts.length} total`
    }
    return sprouts.length > 0 ? `${sprouts.length} sprout${sprouts.length === 1 ? '' : 's'}` : ''
  }

  return ''
}

function createTooltip(): HTMLDivElement {
  const tooltip = document.createElement('div')
  tooltip.className = 'node-tooltip hidden'

  const text = document.createElement('span')
  text.className = 'node-tooltip-text'
  tooltip.append(text)

  const arrow = document.createElement('div')
  arrow.className = 'node-tooltip-arrow'
  tooltip.append(arrow)

  return tooltip
}

function positionTooltip(tooltip: HTMLDivElement, node: HTMLButtonElement): void {
  const rect = node.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()

  let left = rect.left + rect.width / 2
  const top = rect.top - 8

  // Clamp horizontally to viewport
  const halfWidth = tooltipRect.width / 2
  if (left - halfWidth < 4) left = halfWidth + 4
  if (left + halfWidth > window.innerWidth - 4) left = window.innerWidth - 4 - halfWidth

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
  tooltip.style.transform = `translateX(-50%) translateY(-100%)`
}

function attachTooltipListeners(nodes: HTMLButtonElement[], tooltip: HTMLDivElement): void {
  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  let activeNode: HTMLButtonElement | null = null

  const showTooltip = (node: HTMLButtonElement): void => {
    const content = getTooltipText(node)
    if (!content) return

    const text = tooltip.querySelector<HTMLSpanElement>('.node-tooltip-text')
    if (text) text.textContent = content

    tooltip.classList.remove('hidden')
    activeNode = node
    positionTooltip(tooltip, node)
  }

  const hideTooltip = (): void => {
    if (hoverTimer !== null) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
    tooltip.classList.add('hidden')
    activeNode = null
  }

  for (const node of nodes) {
    node.addEventListener('mouseenter', () => {
      hideTooltip()
      hoverTimer = setTimeout(() => {
        showTooltip(node)
      }, 150)
    })

    node.addEventListener('mouseleave', () => {
      hideTooltip()
    })

    node.addEventListener('mousemove', () => {
      if (activeNode === node) {
        positionTooltip(tooltip, node)
      }
    })
  }
}

export function buildTreeNodes(onNodeClick: NodeClickHandler): TreeNodesElements {
  const allNodes: HTMLButtonElement[] = []
  const branchGroups: BranchGroup[] = []
  const nodeLookup = new Map<string, HTMLButtonElement>()

  // Map Panel
  const mapPanel = document.createElement('section')
  mapPanel.className = 'map-panel'

  const canvas = document.createElement('div')
  canvas.className = 'canvas'

  // Guide layer is OUTSIDE canvas to avoid transform issues
  const guideLayer = document.createElement('canvas')
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
    branch.setAttribute('aria-label', `Branch: ${i + 1}`)

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

  const tooltip = createTooltip()
  mapPanel.append(canvas, guideLayer, tooltip)

  attachTooltipListeners(allNodes, tooltip)

  return {
    mapPanel,
    canvas,
    guideLayer,
    trunk,
    branchGroups,
    allNodes,
    nodeLookup,
    tooltip,
  }
}
