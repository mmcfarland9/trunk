import './style.css'
import ampersandImage from '../assets/ampersand.png'

type BranchNode = {
  wrapper: HTMLDivElement
  main: HTMLButtonElement
  subs: HTMLButtonElement[]
}

type CircleData = {
  label: string
  detail: string
}

type EditorApi = {
  container: HTMLDivElement
  open: (target: HTMLButtonElement, placeholder: string) => void
  reposition: (target: HTMLButtonElement) => void
  close: () => void
}

type BranchProgressItem = {
  button: HTMLButtonElement
  label: HTMLSpanElement
  count: HTMLSpanElement
  fill: HTMLSpanElement
  mainCircle: HTMLButtonElement
  index: number
}

type ViewMode = 'overview' | 'branch'

const branchCount = 8
const subCircleCount = 8
const totalCircles = branchCount * (subCircleCount + 1) + 1
const storageKey = 'harada-notes-v1'
const circleState: Record<string, CircleData> = loadState()

const allCircles: HTMLButtonElement[] = []
const branches: BranchNode[] = []
const circleLookup = new Map<string, HTMLButtonElement>()
const branchProgressItems: BranchProgressItem[] = []

const statusDefaultMessage = 'Auto-saves locally in this browser.'
let statusTimeoutId = 0
let lastSavedAt: Date | null = null
let zoomTimeoutId = 0

let activeCircle: HTMLButtonElement | null = null
let focusedCircle: HTMLButtonElement | null = null
let viewMode: ViewMode = 'overview'
let activeBranchIndex: number | null = null

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Root container "#app" not found.')
}

const shell = document.createElement('div')
shell.className = 'app-shell'

const header = document.createElement('header')
header.className = 'app-header'

const titleBlock = document.createElement('div')
titleBlock.className = 'header-text'
titleBlock.innerHTML = `
  <p class="eyebrow">Harada method mapping</p>
  <h1>64-circle planning map</h1>
  <p class="lede">Anchor your central intent, build eight branches, then detail each branch with supporting actions.</p>
`

const actions = document.createElement('div')
actions.className = 'app-actions'

const importButton = document.createElement('button')
importButton.type = 'button'
importButton.className = 'action-button ghost'
importButton.textContent = 'Import'
importButton.addEventListener('click', () => importInput.click())

const exportButton = document.createElement('button')
exportButton.type = 'button'
exportButton.className = 'action-button'
exportButton.textContent = 'Export JSON'
exportButton.addEventListener('click', handleExport)

const copyButton = document.createElement('button')
copyButton.type = 'button'
copyButton.className = 'action-button'
copyButton.textContent = 'Copy summary'
copyButton.addEventListener('click', handleCopySummary)

const resetButton = document.createElement('button')
resetButton.type = 'button'
resetButton.className = 'action-button secondary'
resetButton.textContent = 'Reset map'
resetButton.addEventListener('click', handleReset)

const importInput = document.createElement('input')
importInput.type = 'file'
importInput.accept = 'application/json'
importInput.className = 'visually-hidden'
importInput.addEventListener('change', handleImport)

actions.append(importButton, exportButton, copyButton, resetButton)
header.append(titleBlock, actions, importInput)

const body = document.createElement('div')
body.className = 'app-body'

const mapPanel = document.createElement('section')
mapPanel.className = 'map-panel'

const canvas = document.createElement('div')
canvas.className = 'canvas'

const guideLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
guideLayer.classList.add('guide-layer')
canvas.append(guideLayer)

const center = document.createElement('button')
center.type = 'button'
center.className = 'circle center-circle'
center.dataset.circleId = 'center'
center.dataset.defaultLabel = 'Purpose'
center.dataset.placeholder = 'Purpose'
center.setAttribute('aria-label', 'Center purpose')
center.style.setProperty('--ampersand', `url(${ampersandImage})`)

const centerLabel = document.createElement('span')
centerLabel.className = 'center-title circle-label'
centerLabel.textContent = 'Purpose'
center.append(centerLabel)

const zoomTitle = document.createElement('div')
zoomTitle.className = 'zoom-title is-hidden'
zoomTitle.setAttribute('aria-hidden', 'true')

const zoomOutButton = document.createElement('button')
zoomOutButton.type = 'button'
zoomOutButton.className = 'zoom-button is-hidden'
zoomOutButton.textContent = 'Back to overview'
zoomOutButton.tabIndex = -1
zoomOutButton.setAttribute('aria-hidden', 'true')
zoomOutButton.addEventListener('click', () => returnToOverview())

canvas.append(center, zoomTitle, zoomOutButton)

const editor = buildEditor()
canvas.append(editor.container)

const info = document.createElement('p')
info.className = 'instructions'
info.textContent = 'Click a branch circle to zoom in and reveal its eight leaves. Click the center to define purpose.'

mapPanel.append(canvas, info)

const sidePanel = document.createElement('aside')
sidePanel.className = 'side-panel'
sidePanel.innerHTML = `
  <section class="panel-section">
    <h2>Focus</h2>
    <p class="focus-meta">No circle selected yet.</p>
    <p class="focus-title is-muted">Select a circle to begin.</p>
    <p class="focus-detail is-muted">Notes you add will appear here for quick reference.</p>
  </section>
  <section class="panel-section">
    <h2>Progress</h2>
    <p class="progress-count"></p>
    <p class="progress-meta"></p>
    <div class="progress-track">
      <span class="progress-fill" style="width: 0%"></span>
    </div>
    <div class="progress-actions">
      <button type="button" class="panel-button next-open">Jump to next open</button>
    </div>
    <div class="branch-progress"></div>
  </section>
  <section class="panel-section">
    <h2>Status</h2>
    <p class="status-message"></p>
    <p class="status-meta"></p>
  </section>
  <section class="panel-section">
    <h2>Prompts</h2>
    <ul class="prompt-list">
      <li>What is the central intention that anchors the map?</li>
      <li>Which eight branches move the intention forward?</li>
      <li>Which details make each branch actionable this week?</li>
    </ul>
  </section>
`

const focusMeta = sidePanel.querySelector<HTMLParagraphElement>('.focus-meta')!
const focusTitle = sidePanel.querySelector<HTMLParagraphElement>('.focus-title')!
const focusDetail = sidePanel.querySelector<HTMLParagraphElement>('.focus-detail')!
const progressCount = sidePanel.querySelector<HTMLParagraphElement>('.progress-count')!
const progressMeta = sidePanel.querySelector<HTMLParagraphElement>('.progress-meta')!
const progressFill = sidePanel.querySelector<HTMLSpanElement>('.progress-fill')!
const nextButton = sidePanel.querySelector<HTMLButtonElement>('.next-open')!
const branchProgress = sidePanel.querySelector<HTMLDivElement>('.branch-progress')!
const statusMessage = sidePanel.querySelector<HTMLParagraphElement>('.status-message')!
const statusMeta = sidePanel.querySelector<HTMLParagraphElement>('.status-meta')!

nextButton.addEventListener('click', handleNextOpen)

body.append(mapPanel, sidePanel)
shell.append(header, body)
app.append(shell)

attachEditing(center, 'Purpose')
allCircles.push(center)

for (let i = 0; i < branchCount; i += 1) {
  const wrapper = document.createElement('div')
  wrapper.className = 'branch'

  const mainId = `branch-${i}`
  const main = document.createElement('button')
  main.type = 'button'
  main.className = 'circle main-circle'
  main.dataset.circleId = mainId
  main.dataset.defaultLabel = String(i + 1)
  main.dataset.placeholder = `Branch ${i + 1}`
  main.dataset.branchIndex = String(i)
  main.setAttribute('aria-label', `Primary circle ${i + 1}`)
  attachEditing(main, `Branch ${i + 1}`)
  allCircles.push(main)

  const subs: HTMLButtonElement[] = []
  for (let j = 0; j < subCircleCount; j += 1) {
    const subId = `branch-${i}-sub-${j}`
    const sub = document.createElement('button')
    sub.type = 'button'
    sub.className = 'circle sub-circle'
    sub.dataset.circleId = subId
    sub.dataset.defaultLabel = '○'
    sub.dataset.placeholder = `Detail ${j + 1} for branch ${i + 1}`
    sub.dataset.branchIndex = String(i)
    sub.style.setProperty('--leaf-delay', `${j * 55}ms`)
    sub.setAttribute('aria-label', `Detail ${j + 1} for circle ${i + 1}`)
    attachEditing(sub, `Detail ${j + 1} for branch ${i + 1}`)
    subs.push(sub)
    allCircles.push(sub)
    wrapper.append(sub)
  }

  wrapper.append(main)
  branches.push({ wrapper, main, subs })
  canvas.append(wrapper)
}

buildBranchProgress()
setViewMode('overview')
setStatus(statusDefaultMessage, 'info')
updateStats()
updateFocus(null)
updateStatusMeta()

let resizeId = 0
const resizeObserver = new ResizeObserver(() => {
  if (resizeId) {
    window.cancelAnimationFrame(resizeId)
  }
  resizeId = window.requestAnimationFrame(() => positionNodes())
})
resizeObserver.observe(canvas)
window.addEventListener('resize', () => positionNodes())

positionNodes()

function setStatus(message: string, tone: 'info' | 'success' | 'warning' | 'error') {
  statusMessage.textContent = message
  statusMessage.dataset.tone = tone
}

function flashStatus(message: string, tone: 'info' | 'success' | 'warning' | 'error' = 'info') {
  setStatus(message, tone)
  if (statusTimeoutId) {
    window.clearTimeout(statusTimeoutId)
  }
  statusTimeoutId = window.setTimeout(() => {
    setStatus(statusDefaultMessage, 'info')
  }, 4200)
}

function updateStatusMeta() {
  if (lastSavedAt) {
    statusMeta.textContent = `Last saved at ${formatTime(lastSavedAt)}.`
  } else if (Object.keys(circleState).length) {
    statusMeta.textContent = 'Saved notes loaded from this browser.'
  } else {
    statusMeta.textContent = 'No saved notes yet.'
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function setCircleLabel(element: HTMLButtonElement, label: string) {
  const labelNode = element.querySelector<HTMLElement>('.circle-label')
  if (labelNode) {
    labelNode.textContent = label
  } else {
    element.textContent = label
  }
}

function getCirclePlaceholder(element: HTMLButtonElement) {
  return element.dataset.placeholder || element.dataset.defaultLabel || 'Circle'
}

function setCircleVisibility(element: HTMLButtonElement, isVisible: boolean) {
  element.classList.toggle('is-hidden', !isVisible)
  element.setAttribute('aria-hidden', isVisible ? 'false' : 'true')
  element.tabIndex = isVisible ? 0 : -1
}

function updateZoomTitle() {
  if (viewMode === 'branch' && activeBranchIndex !== null) {
    const label = getBranchLabel(branches[activeBranchIndex].main, activeBranchIndex)
    zoomTitle.textContent = `${label} details`
  }
}

function updateInstructions() {
  if (viewMode === 'overview') {
    info.textContent = 'Click a branch circle to zoom in and reveal its eight leaves. Click the center to define purpose.'
    return
  }
  if (activeBranchIndex !== null) {
    const label = getBranchLabel(branches[activeBranchIndex].main, activeBranchIndex)
    info.textContent = `Viewing ${label}. Edit the branch or its leaves, then return to overview.`
  }
}

function updateVisibility() {
  const isBranchView = viewMode === 'branch' && activeBranchIndex !== null
  canvas.classList.toggle('is-zoomed', isBranchView)
  setCircleVisibility(center, !isBranchView)

  branches.forEach((branch, index) => {
    const isActive = isBranchView && index === activeBranchIndex
    branch.wrapper.classList.toggle('is-hidden', isBranchView && !isActive)
    branch.wrapper.classList.toggle('is-active', isActive)

    setCircleVisibility(branch.main, !isBranchView || isActive)
    branch.subs.forEach((sub) => {
      setCircleVisibility(sub, isBranchView && isActive)
    })
  })

  zoomOutButton.classList.toggle('is-hidden', !isBranchView)
  zoomTitle.classList.toggle('is-hidden', !isBranchView)
  zoomOutButton.tabIndex = isBranchView ? 0 : -1
  zoomOutButton.setAttribute('aria-hidden', isBranchView ? 'false' : 'true')
  zoomTitle.setAttribute('aria-hidden', isBranchView ? 'false' : 'true')
}

function setViewMode(mode: ViewMode, branchIndex?: number) {
  const previousMode = viewMode
  const previousBranch = activeBranchIndex
  viewMode = mode
  if (mode === 'branch') {
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
  } else {
    activeBranchIndex = null
  }
  const shouldAnimate = previousMode !== viewMode || previousBranch !== activeBranchIndex
  if (shouldAnimate) {
    canvas.classList.add('is-zooming')
    if (zoomTimeoutId) {
      window.clearTimeout(zoomTimeoutId)
    }
    zoomTimeoutId = window.setTimeout(() => {
      canvas.classList.remove('is-zooming')
    }, 420)
  }
  editor.close()
  updateVisibility()
  updateZoomTitle()
  updateInstructions()
  positionNodes()
}

function returnToOverview() {
  const fallback =
    focusedCircle?.dataset.branchIndex !== undefined
      ? branches[Number(focusedCircle.dataset.branchIndex)]?.main ?? null
      : focusedCircle
  setViewMode('overview')
  if (fallback) {
    setFocusedCircle(fallback)
  } else {
    updateFocus(null)
  }
}

function enterBranchView(index: number, focusCircle?: HTMLButtonElement | null, openEditor = false) {
  setViewMode('branch', index)
  const target = focusCircle ?? branches[index]?.main ?? null
  if (!target) return
  setFocusedCircle(target)
  if (openEditor) {
    window.setTimeout(() => {
      editor.open(target, getCirclePlaceholder(target))
    }, 220)
  }
}

function attachEditing(element: HTMLButtonElement, placeholder: string) {
  const circleId = element.dataset.circleId
  if (circleId) {
    circleLookup.set(circleId, element)
  }
  element.dataset.placeholder = placeholder

  const defaultLabel = element.dataset.defaultLabel || ''
  const stored = circleId ? circleState[circleId] : undefined
  const storedLabel = stored?.label?.trim() || ''
  const label = storedLabel || defaultLabel

  setCircleLabel(element, label)

  const hasContent = Boolean(stored && (stored.detail?.trim() || (storedLabel && storedLabel !== defaultLabel)))
  element.dataset.filled = hasContent ? 'true' : 'false'

  element.addEventListener('click', (event) => {
    event.stopPropagation()
    if (!circleId) return
    const branchIndex = element.dataset.branchIndex
    if (branchIndex !== undefined && viewMode === 'overview') {
      enterBranchView(Number(branchIndex))
      return
    }
    setFocusedCircle(element)
    activeCircle = element
    editor.open(element, placeholder)
  })
}

function setFocusedCircle(target: HTMLButtonElement | null) {
  if (focusedCircle && focusedCircle !== target) {
    focusedCircle.classList.remove('is-focused')
  }
  focusedCircle = target
  if (focusedCircle) {
    focusedCircle.classList.add('is-focused')
  }

  const focusedBranch = target?.dataset.branchIndex
  branchProgressItems.forEach((item) => {
    item.button.classList.toggle('is-current', focusedBranch === String(item.index))
  })

  updateFocus(focusedCircle)
}

function updateFocus(target: HTMLButtonElement | null) {
  if (!target) {
    focusMeta.textContent = 'No circle selected yet.'
    focusTitle.textContent = 'Select a circle to begin.'
    focusTitle.classList.add('is-muted')
    focusDetail.textContent = 'Notes you add will appear here for quick reference.'
    focusDetail.classList.add('is-muted')
    return
  }

  const circleId = target.dataset.circleId
  const defaultLabel = target.dataset.defaultLabel || ''
  const stored = circleId ? circleState[circleId] : undefined
  const label = stored?.label?.trim() || ''
  const detail = stored?.detail?.trim() || ''
  const hasCustomLabel = Boolean(label && label !== defaultLabel)
  const placeholder = getCirclePlaceholder(target)
  const displayLabel = hasCustomLabel ? label : placeholder

  focusMeta.textContent = target.getAttribute('aria-label') || 'Selected circle'
  focusTitle.textContent = displayLabel
  focusTitle.classList.toggle('is-muted', !hasCustomLabel)
  focusDetail.textContent = detail || 'Add detail to capture the context and next steps.'
  focusDetail.classList.toggle('is-muted', !detail)
}

function updateStats() {
  const filled = allCircles.filter((circle) => circle.dataset.filled === 'true').length
  const filledBranches = branches.filter((branch) => branch.main.dataset.filled === 'true').length
  const filledDetails = branches.reduce((total, branch) => {
    return total + branch.subs.filter((sub) => sub.dataset.filled === 'true').length
  }, 0)
  const totalDetails = branchCount * subCircleCount

  progressCount.textContent = `${filled} of ${totalCircles} nodes filled`
  progressMeta.textContent = `Branches ${filledBranches}/${branchCount} | Details ${filledDetails}/${totalDetails}`

  const progress = totalCircles ? Math.round((filled / totalCircles) * 100) : 0
  progressFill.style.width = `${progress}%`

  const next = findNextOpenCircle(focusedCircle)
  if (next) {
    nextButton.disabled = false
    nextButton.textContent = 'Jump to next open'
  } else {
    nextButton.disabled = true
    nextButton.textContent = 'All nodes filled'
  }

  updateBranchProgress()
  updateInstructions()
}

function buildBranchProgress() {
  branchProgress.replaceChildren()
  branchProgressItems.length = 0

  branches.forEach((branch, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'branch-item'
    button.addEventListener('click', () => {
      if (viewMode !== 'branch' || activeBranchIndex !== index) {
        enterBranchView(index)
      } else {
        setFocusedCircle(branch.main)
      }
      branch.main.focus({ preventScroll: true })
    })

    const label = document.createElement('span')
    label.className = 'branch-label'

    const count = document.createElement('span')
    count.className = 'branch-count'

    const track = document.createElement('span')
    track.className = 'branch-track'

    const fill = document.createElement('span')
    fill.className = 'branch-fill'

    track.append(fill)
    button.append(label, count, track)
    branchProgress.append(button)

    branchProgressItems.push({ button, label, count, fill, mainCircle: branch.main, index })
  })
}

function updateBranchProgress() {
  branchProgressItems.forEach((item) => {
    const branch = branches[item.index]
    const filledDetails = branch.subs.filter((sub) => sub.dataset.filled === 'true').length
    const totalDetails = branch.subs.length
    const progress = totalDetails ? Math.round((filledDetails / totalDetails) * 100) : 0

    item.label.textContent = getBranchLabel(branch.main, item.index)
    item.count.textContent = `${filledDetails}/${totalDetails}`
    item.fill.style.width = `${progress}%`

    const hasLabel = branch.main.dataset.filled === 'true'
    item.button.classList.toggle('is-labeled', hasLabel)
    item.button.classList.toggle('is-complete', filledDetails === totalDetails && totalDetails > 0)
  })

  updateZoomTitle()
}

function getBranchLabel(mainCircle: HTMLButtonElement, index: number) {
  const defaultLabel = mainCircle.dataset.defaultLabel || ''
  const stored = circleState[mainCircle.dataset.circleId || '']
  const storedLabel = stored?.label?.trim() || ''
  if (storedLabel && storedLabel !== defaultLabel) {
    return storedLabel
  }
  return `Branch ${index + 1}`
}

function findNextOpenCircle(startFrom?: HTMLButtonElement | null) {
  if (!allCircles.length) return null
  const startIndex = startFrom ? allCircles.indexOf(startFrom) : -1
  for (let offset = 1; offset <= allCircles.length; offset += 1) {
    const index = (startIndex + offset + allCircles.length) % allCircles.length
    const candidate = allCircles[index]
    if (candidate.dataset.filled !== 'true') {
      return candidate
    }
  }
  return null
}

function openCircleForEditing(circle: HTMLButtonElement) {
  const branchIndex = circle.dataset.branchIndex
  const isCenter = circle.dataset.circleId === 'center'

  if (branchIndex !== undefined) {
    const index = Number(branchIndex)
    if (viewMode !== 'branch' || activeBranchIndex !== index) {
      enterBranchView(index, circle, true)
      return
    }
  } else if (isCenter && viewMode === 'branch') {
    setViewMode('overview')
    window.setTimeout(() => {
      setFocusedCircle(circle)
      editor.open(circle, getCirclePlaceholder(circle))
    }, 220)
    return
  }

  setFocusedCircle(circle)
  circle.focus({ preventScroll: true })
  editor.open(circle, getCirclePlaceholder(circle))
}

function handleNextOpen() {
  const next = findNextOpenCircle(focusedCircle)
  if (!next) {
    flashStatus('All nodes are filled. Nice work.', 'success')
    return
  }
  openCircleForEditing(next)
}

function positionNodes() {
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return
  }

  const centerRect = center.getBoundingClientRect()
  const referenceMain = branches[0]?.main
  const referenceSub = branches[0]?.subs[0]

  const centerRadius = centerRect.width / 2
  const mainRadius = referenceMain ? referenceMain.getBoundingClientRect().width / 2 : 0
  const subRadiusPx = referenceSub ? referenceSub.getBoundingClientRect().width / 2 : 0

  const base = Math.min(rect.width, rect.height)
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const gap = 8
  const branchStartOffset = Math.max(centerRadius + gap, 0)
  const branchEndOffset = Math.max(mainRadius + gap, 0)
  const detailStartOffset = Math.max(mainRadius + gap, 0)
  const detailEndOffset = Math.max(subRadiusPx + 4, 0)

  guideLayer.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`)
  guideLayer.setAttribute('width', `${rect.width}`)
  guideLayer.setAttribute('height', `${rect.height}`)
  guideLayer.replaceChildren()

  const lineFragment = document.createDocumentFragment()

  if (viewMode === 'branch' && activeBranchIndex !== null) {
    const node = branches[activeBranchIndex]
    if (node) {
      const branchX = centerX
      const branchY = centerY
      const detailRadiusX = base * 0.28
      const detailRadiusY = base * 0.22

      node.wrapper.style.left = `${branchX}px`
      node.wrapper.style.top = `${branchY}px`

      node.subs.forEach((sub, subIndex) => {
        const subAngle = ((Math.PI * 2) / subCircleCount) * subIndex - Math.PI / 2
        const offsetX = Math.cos(subAngle) * detailRadiusX
        const offsetY = Math.sin(subAngle) * detailRadiusY

        sub.style.left = `${offsetX}px`
        sub.style.top = `${offsetY}px`

        const detailLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        const detailStartX = branchX + Math.cos(subAngle) * detailStartOffset
        const detailStartY = branchY + Math.sin(subAngle) * detailStartOffset
        const detailEndX = branchX + offsetX - Math.cos(subAngle) * detailEndOffset
        const detailEndY = branchY + offsetY - Math.sin(subAngle) * detailEndOffset

        detailLine.setAttribute('x1', `${detailStartX}`)
        detailLine.setAttribute('y1', `${detailStartY}`)
        detailLine.setAttribute('x2', `${detailEndX}`)
        detailLine.setAttribute('y2', `${detailEndY}`)
        detailLine.classList.add('guide-line', 'sub-line')
        lineFragment.append(detailLine)
      })
    }
  } else {
    const radiusX = base * 0.42
    const radiusY = base * 0.32
    const detailRadiusX = base * 0.16
    const detailRadiusY = base * 0.16

    branches.forEach((node, index) => {
      const angle = (Math.PI / 4) * index - Math.PI / 2
      const branchX = centerX + Math.cos(angle) * radiusX
      const branchY = centerY + Math.sin(angle) * radiusY

      node.wrapper.style.left = `${branchX}px`
      node.wrapper.style.top = `${branchY}px`

      const branchLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      const branchStartX = centerX + Math.cos(angle) * branchStartOffset
      const branchStartY = centerY + Math.sin(angle) * branchStartOffset
      const branchEndX = branchX - Math.cos(angle) * branchEndOffset
      const branchEndY = branchY - Math.sin(angle) * branchEndOffset

      branchLine.setAttribute('x1', `${branchStartX}`)
      branchLine.setAttribute('y1', `${branchStartY}`)
      branchLine.setAttribute('x2', `${branchEndX}`)
      branchLine.setAttribute('y2', `${branchEndY}`)
      branchLine.classList.add('guide-line')
      lineFragment.append(branchLine)

      node.subs.forEach((sub, subIndex) => {
        const subAngle = ((Math.PI * 2) / subCircleCount) * subIndex - Math.PI / 2
        const offsetX = Math.cos(subAngle) * detailRadiusX
        const offsetY = Math.sin(subAngle) * detailRadiusY

        sub.style.left = `${offsetX}px`
        sub.style.top = `${offsetY}px`
      })
    })
  }

  guideLayer.append(lineFragment)

  if (activeCircle) {
    editor.reposition(activeCircle)
  }
}

function loadState(): Record<string, CircleData> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, CircleData>
    }
  } catch (error) {
    console.warn('Could not read saved notes', error)
  }
  return {}
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(circleState))
    lastSavedAt = new Date()
    updateStatusMeta()
  } catch (error) {
    console.warn('Could not save notes', error)
  }
}

function syncCircle(element: HTMLButtonElement) {
  const circleId = element.dataset.circleId
  if (!circleId) return

  const stored = circleState[circleId]
  const defaultLabel = element.dataset.defaultLabel || ''
  const storedLabel = stored?.label?.trim() || ''
  const label = storedLabel || defaultLabel

  setCircleLabel(element, label)

  const hasContent = Boolean(stored && (stored.detail?.trim() || (storedLabel && storedLabel !== defaultLabel)))
  element.dataset.filled = hasContent ? 'true' : 'false'
}

function handleExport() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    circles: circleState,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'harada-map.json'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  flashStatus('Exported JSON file.', 'success')
}

async function handleCopySummary() {
  const summary = buildSummary()
  if (!summary.trim()) {
    flashStatus('Nothing to copy yet.', 'warning')
    return
  }

  try {
    await navigator.clipboard.writeText(summary)
    flashStatus('Summary copied to clipboard.', 'success')
  } catch (error) {
    const fallback = document.createElement('textarea')
    fallback.value = summary
    fallback.setAttribute('readonly', 'true')
    fallback.style.position = 'absolute'
    fallback.style.left = '-9999px'
    document.body.append(fallback)
    fallback.select()
    document.execCommand('copy')
    fallback.remove()
    flashStatus('Summary copied with fallback.', 'success')
  }
}

function buildSummary() {
  const lines: string[] = []
  const purpose = circleState.center
  if (purpose?.label || purpose?.detail) {
    const title = purpose.label || 'Purpose'
    lines.push(`Purpose: ${title}`)
    if (purpose.detail) {
      lines.push(`${purpose.detail}`)
    }
    lines.push('')
  }

  branches.forEach((branch, index) => {
    const mainId = branch.main.dataset.circleId || ''
    const mainData = circleState[mainId]
    const subEntries = branch.subs
      .map((sub, subIndex) => ({
        element: sub,
        data: circleState[sub.dataset.circleId || ''],
        index: subIndex,
      }))
      .filter((entry) => Boolean(entry.data))

    if (!mainData && subEntries.length === 0) {
      return
    }

    const branchTitle = getBranchLabel(branch.main, index)
    lines.push(branchTitle)

    if (mainData?.detail) {
      lines.push(`  Note: ${mainData.detail}`)
    }

    subEntries.forEach((entry) => {
      const subLabel = entry.data?.label?.trim() || `Detail ${entry.index + 1}`
      if (entry.data?.detail) {
        lines.push(`  - ${subLabel}: ${entry.data.detail}`)
      } else {
        lines.push(`  - ${subLabel}`)
      }
    })

    lines.push('')
  })

  return lines.join('\n').trim()
}

function handleReset() {
  const confirmed = window.confirm('Reset all notes? This clears every label and detail in the map.')
  if (!confirmed) return

  Object.keys(circleState).forEach((key) => delete circleState[key])
  lastSavedAt = null
  try {
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.warn('Could not clear saved notes', error)
  }

  allCircles.forEach((circle) => {
    setCircleLabel(circle, circle.dataset.defaultLabel || '')
    circle.dataset.filled = 'false'
  })
  syncCircle(center)

  setViewMode('overview')
  setFocusedCircle(null)
  updateStats()
  updateStatusMeta()
  flashStatus('Map reset to a clean slate.', 'warning')
}

async function handleImport() {
  const file = importInput.files?.[0]
  if (!file) return

  importInput.value = ''

  if (Object.keys(circleState).length) {
    const confirmed = window.confirm('Import notes? This will replace existing notes.')
    if (!confirmed) {
      return
    }
  }

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    const raw = parsed && typeof parsed === 'object' ? (parsed.circles ?? parsed) : null
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid format')
    }

    const nextState: Record<string, CircleData> = {}
    Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
      if (!circleLookup.has(key)) return
      if (!value || typeof value !== 'object') return

      const label = typeof (value as CircleData).label === 'string' ? (value as CircleData).label.trim() : ''
      const detail = typeof (value as CircleData).detail === 'string' ? (value as CircleData).detail.trim() : ''

      if (!label && !detail) return

      const defaultLabel = circleLookup.get(key)?.dataset.defaultLabel || ''
      nextState[key] = {
        label: label || defaultLabel,
        detail,
      }
    })

    Object.keys(circleState).forEach((key) => delete circleState[key])
    Object.entries(nextState).forEach(([key, value]) => {
      circleState[key] = value
    })

    allCircles.forEach((circle) => syncCircle(circle))
    syncCircle(center)

    editor.close()
    saveState()
    updateStats()
    updateFocus(focusedCircle)
    flashStatus('Import complete. Notes applied.', 'success')
  } catch (error) {
    console.error(error)
    flashStatus('Import failed. Check the JSON format.', 'error')
  }
}

function buildEditor(): EditorApi {
  const container = document.createElement('div')
  container.className = 'circle-editor hidden'

  container.innerHTML = `
    <form class="editor-card" novalidate>
      <label class="editor-label">
        Label (one word, 20 chars max)
        <input class="editor-input" name="label" type="text" maxlength="20" />
      </label>
      <label class="editor-label">
        Details
        <textarea class="editor-textarea" name="detail" rows="4" placeholder="Add context"></textarea>
      </label>
      <div class="editor-actions">
        <button type="button" class="editor-clear">Clear</button>
        <button type="button" class="editor-cancel">Cancel</button>
        <button type="submit" class="editor-save">Save</button>
      </div>
    </form>
  `

  const form = container.querySelector<HTMLFormElement>('form')!
  const labelInput = container.querySelector<HTMLInputElement>('.editor-input')!
  const detailInput = container.querySelector<HTMLTextAreaElement>('.editor-textarea')!
  const clearButton = container.querySelector<HTMLButtonElement>('.editor-clear')!
  const cancelButton = container.querySelector<HTMLButtonElement>('.editor-cancel')!

  function closeEditor() {
    container.classList.add('hidden')
    if (activeCircle) {
      activeCircle.classList.remove('is-active')
    }
    activeCircle = null
  }

  function open(target: HTMLButtonElement, placeholder: string) {
    const circleId = target.dataset.circleId
    if (!circleId) return

    const defaultLabel = target.dataset.defaultLabel || ''
    const existing = circleState[circleId]
    const savedLabel = existing?.label || ''

    labelInput.value = savedLabel && savedLabel !== defaultLabel ? savedLabel : ''
    detailInput.value = existing?.detail || ''
    labelInput.placeholder = placeholder

    container.classList.remove('hidden')
    if (activeCircle) {
      activeCircle.classList.remove('is-active')
    }
    activeCircle = target
    activeCircle.classList.add('is-active')
    reposition(target)
    labelInput.focus()
  }

  function reposition(target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect()
    const canvasRect = canvas.getBoundingClientRect()
    const padding = 12
    const desiredX = rect.left - canvasRect.left + rect.width / 2
    const desiredY = rect.top - canvasRect.top - 10

    const halfWidth = container.offsetWidth / 2 || 140
    const clampedX = Math.min(Math.max(desiredX, padding + halfWidth), canvasRect.width - padding - halfWidth)
    const clampedY = Math.min(Math.max(desiredY, padding), canvasRect.height - padding - (container.offsetHeight || 160))

    container.style.left = `${clampedX}px`
    container.style.top = `${clampedY}px`
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (!activeCircle) return
    const circleId = activeCircle.dataset.circleId
    if (!circleId) return

    const rawLabel = labelInput.value.trim()
    const label = rawLabel ? rawLabel.split(/\s+/)[0].slice(0, 20) : ''
    const detail = detailInput.value.trim()
    const defaultLabel = activeCircle.dataset.defaultLabel || ''
    const appliedLabel = label || defaultLabel

    setCircleLabel(activeCircle, appliedLabel)

    const hasContent = Boolean(label || detail)
    activeCircle.dataset.filled = hasContent ? 'true' : 'false'

    if (hasContent) {
      circleState[circleId] = {
        label: appliedLabel,
        detail,
      }
    } else {
      delete circleState[circleId]
    }

    saveState()
    updateStats()
    updateFocus(activeCircle)
    closeEditor()
  }

  function handleCancel(event: Event) {
    event.preventDefault()
    closeEditor()
  }

  function handleClear(event: Event) {
    event.preventDefault()
    if (!activeCircle) return

    const circleId = activeCircle.dataset.circleId
    if (circleId) {
      delete circleState[circleId]
    }

    setCircleLabel(activeCircle, activeCircle.dataset.defaultLabel || '')
    activeCircle.dataset.filled = 'false'

    saveState()
    updateStats()
    updateFocus(activeCircle)
    closeEditor()
  }

  function handleOutside(event: MouseEvent) {
    if (!container.classList.contains('hidden') && !container.contains(event.target as Node)) {
      if (activeCircle && (event.target as Node) !== activeCircle) {
        closeEditor()
      }
    }
  }

  form.addEventListener('submit', handleSubmit)
  cancelButton.addEventListener('click', handleCancel)
  clearButton.addEventListener('click', handleClear)
  canvas.addEventListener('click', handleOutside)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeEditor()
    }
  })

  return {
    container,
    open,
    reposition,
    close: closeEditor,
  }
}
