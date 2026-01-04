import type { EditorApi } from '../types'
import { nodeState, saveState, deleteNodeData, setActiveNode, getActiveNode } from '../state'
import { setNodeLabel } from './node-ui'

export type EditorCallbacks = {
  onSave: () => void
  onUpdateFocus: (target: HTMLButtonElement | null) => void
}

export function buildEditor(canvas: HTMLDivElement, callbacks: EditorCallbacks): EditorApi {
  const container = document.createElement('div')
  container.className = 'node-editor hidden'

  container.innerHTML = `
    <button type="button" class="editor-close-btn" aria-label="Close">×</button>
    <form class="editor-card" novalidate>
      <label class="editor-label">
        <span class="editor-label-text">Label</span>
        <input class="editor-input" name="label" type="text" maxlength="20" />
      </label>
      <label class="editor-label editor-about-label">
        About
        <textarea class="editor-textarea" name="note" rows="3" placeholder="Add details..."></textarea>
      </label>
      <div class="editor-goal-section">
        <div class="goal-type-toggle">
          <button type="button" class="goal-type-btn" data-type="binary">Goal</button>
          <button type="button" class="goal-type-btn" data-type="continuous">Practice</button>
        </div>
        <label class="editor-label goal-milestone-label">
          Milestone
          <input class="editor-input goal-milestone-input" name="milestone" type="text" maxlength="40" placeholder="What are you working on?" />
        </label>
        <button type="button" class="goal-action-btn goal-set-btn" disabled>Set</button>
        <label class="editor-label editor-goal-binary">
          Result
          <div class="goal-result-selector">
            <button type="button" class="result-btn is-active" data-value="false">Incomplete</button>
            <button type="button" class="result-btn" data-value="true">Accomplished</button>
          </div>
        </label>
        <label class="editor-label editor-goal-continuous">
          Consistency
          <div class="goal-slider-row">
            <input class="editor-slider" name="goalContinuous" type="range" min="0" max="5" step="1" value="0" />
            <span class="goal-value">0/5</span>
          </div>
        </label>
        <label class="editor-label goal-notes-label">
          Notes
          <textarea class="editor-textarea goal-notes-input" name="goalNotes" rows="2" placeholder="Any reflections..."></textarea>
        </label>
        <div class="goal-actions">
          <button type="button" class="goal-action-btn goal-history-btn">History</button>
          <button type="button" class="goal-action-btn goal-submit-btn" disabled>Submit</button>
        </div>
      </div>
      <div class="editor-actions">
        <button type="button" class="editor-clear">Clear</button>
        <button type="button" class="editor-cancel">Cancel</button>
        <button type="submit" class="editor-save">Save</button>
      </div>
    </form>
    <div class="goal-history-panel">
      <div class="goal-history-header">
        <span>History</span>
        <button type="button" class="goal-history-close">×</button>
      </div>
      <div class="goal-history-content">
        <p class="goal-history-empty">No history yet</p>
      </div>
    </div>
  `

  const form = container.querySelector<HTMLFormElement>('form')!
  const closeBtn = container.querySelector<HTMLButtonElement>('.editor-close-btn')!
  const labelText = container.querySelector<HTMLSpanElement>('.editor-label-text')!
  const noteInput = container.querySelector<HTMLTextAreaElement>('.editor-textarea')!
  const labelInput = container.querySelector<HTMLInputElement>('input[name="label"]')!
  const aboutLabel = container.querySelector<HTMLLabelElement>('.editor-about-label')!
  const editorActions = container.querySelector<HTMLDivElement>('.editor-actions')!
  const goalSection = container.querySelector<HTMLDivElement>('.editor-goal-section')!
  const goalTypeBtns = container.querySelectorAll<HTMLButtonElement>('.goal-type-btn')
  const goalBinaryLabel = container.querySelector<HTMLLabelElement>('.editor-goal-binary')!
  const goalContinuousLabel = container.querySelector<HTMLLabelElement>('.editor-goal-continuous')!

  // Set tooltip for locked state
  goalSection.dataset.tooltip = 'Check back at the end of the\nperiod to log your progress'
  const milestoneInput = container.querySelector<HTMLInputElement>('input[name="milestone"]')!
  const setBtn = container.querySelector<HTMLButtonElement>('.goal-set-btn')!
  const resultBtns = container.querySelectorAll<HTMLButtonElement>('.result-btn')
  const goalSlider = container.querySelector<HTMLInputElement>('input[name="goalContinuous"]')!
  let goalAccomplished = false
  const goalValueDisplay = container.querySelector<HTMLSpanElement>('.goal-value')!
  const notesLabel = container.querySelector<HTMLLabelElement>('.goal-notes-label')!
  const notesInput = container.querySelector<HTMLTextAreaElement>('textarea[name="goalNotes"]')!
  const goalActions = container.querySelector<HTMLDivElement>('.goal-actions')!
  const submitBtn = container.querySelector<HTMLButtonElement>('.goal-submit-btn')!
  const clearButton = container.querySelector<HTMLButtonElement>('.editor-clear')!
  const cancelButton = container.querySelector<HTMLButtonElement>('.editor-cancel')!

  // Three states: 'setup' | 'locked' | 'unlocked'
  let goalState: 'setup' | 'locked' | 'unlocked' = 'setup'
  let isProgressLocked = true
  let isPanelLocked = false
  const historyPanel = container.querySelector<HTMLDivElement>('.goal-history-panel')!
  const historyBtn = container.querySelector<HTMLButtonElement>('.goal-history-btn')!
  const historyCloseBtn = container.querySelector<HTMLButtonElement>('.goal-history-close')!

  let currentGoalType: 'binary' | 'continuous' | null = null

  function updateGoalUI(): void {
    const hasMilestone = milestoneInput.value.trim().length > 0
    const hasType = currentGoalType !== null

    if (goalState === 'setup') {
      // State 1: Before setting goal
      // Show: type toggle, milestone input, set button
      // Hide: result section, notes, history/submit
      setBtn.style.display = ''
      setBtn.disabled = !(hasMilestone && hasType)
      goalBinaryLabel.style.display = 'none'
      goalContinuousLabel.style.display = 'none'
      notesLabel.style.display = 'none'
      goalActions.style.display = 'none'
      goalSection.classList.remove('is-locked')
      milestoneInput.disabled = false
      goalTypeBtns.forEach(btn => btn.disabled = false)
    } else if (goalState === 'locked') {
      // State 2: Goal set, period active (locked)
      // Show everything but greyed/locked
      setBtn.style.display = 'none'
      goalBinaryLabel.style.display = currentGoalType === 'binary' ? '' : 'none'
      goalContinuousLabel.style.display = currentGoalType === 'continuous' ? '' : 'none'
      notesLabel.style.display = 'none'
      goalActions.style.display = 'flex'
      goalSection.classList.add('is-locked')
      milestoneInput.disabled = true
      goalTypeBtns.forEach(btn => btn.disabled = true)
      resultBtns.forEach(btn => btn.disabled = true)
      goalSlider.disabled = true
      submitBtn.disabled = true
    } else {
      // State 3: Period ended (unlocked)
      // Show result, notes, submit enabled
      setBtn.style.display = 'none'
      goalBinaryLabel.style.display = currentGoalType === 'binary' ? '' : 'none'
      goalContinuousLabel.style.display = currentGoalType === 'continuous' ? '' : 'none'
      notesLabel.style.display = ''
      goalActions.style.display = 'flex'
      goalSection.classList.remove('is-locked')
      milestoneInput.disabled = true
      goalTypeBtns.forEach(btn => btn.disabled = true)
      resultBtns.forEach(btn => btn.disabled = false)
      goalSlider.disabled = false
      submitBtn.disabled = false
    }
  }

  milestoneInput.addEventListener('input', updateGoalUI)

  setBtn.addEventListener('click', () => {
    // Transition from setup to locked
    goalState = isProgressLocked ? 'locked' : 'unlocked'
    updateGoalUI()
  })

  submitBtn.addEventListener('click', () => {
    // Submit to history and reset to setup
    console.log('Submit result to history:', {
      type: currentGoalType,
      milestone: milestoneInput.value,
      result: currentGoalType === 'binary' ? goalAccomplished : goalSlider.value,
      notes: notesInput.value
    })
    // Reset to setup state
    goalState = 'setup'
    currentGoalType = null
    milestoneInput.value = ''
    notesInput.value = ''
    setGoalAccomplished(false)
    goalSlider.value = '0'
    goalValueDisplay.textContent = '0/5'
    goalTypeBtns.forEach(btn => btn.classList.remove('is-active'))
    updateGoalUI()
  })

  function toggleHistoryPanel(show?: boolean): void {
    const shouldShow = show ?? !historyPanel.classList.contains('is-open')
    historyPanel.classList.toggle('is-open', shouldShow)
  }

  historyBtn.addEventListener('click', () => toggleHistoryPanel())
  historyCloseBtn.addEventListener('click', () => toggleHistoryPanel(false))

  function setGoalType(type: 'binary' | 'continuous' | null): void {
    currentGoalType = type
    goalTypeBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.type === type))
    updateGoalUI()
  }

  goalTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const clickedType = btn.dataset.type as 'binary' | 'continuous'
      // Toggle off if clicking the active type
      if (currentGoalType === clickedType) {
        setGoalType(null)
      } else {
        setGoalType(clickedType)
      }
    })
  })

  function setGoalAccomplished(accomplished: boolean): void {
    goalAccomplished = accomplished
    resultBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.value === String(accomplished)))
  }

  resultBtns.forEach(btn => {
    btn.addEventListener('click', () => setGoalAccomplished(btn.dataset.value === 'true'))
  })

  goalSlider.addEventListener('input', () => {
    goalValueDisplay.textContent = `${goalSlider.value}/5`
  })

  function closeEditor(): void {
    container.classList.add('hidden')
    toggleHistoryPanel(false)
    const active = getActiveNode()
    if (active) {
      active.classList.remove('is-active')
    }
    setActiveNode(null)
  }

  function updatePanelLockedUI(isLeaf: boolean): void {
    // When panel is locked: disable label input, hide about section, hide editor actions
    // Goal section remains visible and editable
    labelInput.disabled = isPanelLocked
    labelInput.classList.toggle('is-locked', isPanelLocked)
    aboutLabel.style.display = isPanelLocked ? 'none' : (isLeaf ? 'none' : '')
    editorActions.style.display = isPanelLocked ? 'none' : ''
  }

  function open(target: HTMLButtonElement, placeholder: string): void {
    const nodeId = target.dataset.nodeId
    if (!nodeId) return

    // If panel is locked and this is not a leaf, don't open (nothing to edit)
    const isLeaf = target.classList.contains('leaf')
    if (isPanelLocked && !isLeaf) return

    toggleHistoryPanel(false)
    const isTrunk = target.classList.contains('trunk')
    labelText.textContent = isLeaf ? 'Leaf' : isTrunk ? 'Trunk' : 'Branch'
    labelInput.placeholder = isLeaf ? 'Add title...' : placeholder
    noteInput.placeholder = 'Add details...'

    // Leaves: show Goal section, hide About. Others: show About, hide Goal
    goalSection.style.display = isLeaf ? '' : 'none'
    updatePanelLockedUI(isLeaf)

    const defaultLabel = target.dataset.defaultLabel || ''
    const existing = nodeState[nodeId]
    const savedLabel = existing?.label || ''

    labelInput.value = savedLabel && savedLabel !== defaultLabel ? savedLabel : ''
    noteInput.value = existing?.note || ''

    // Load goal state
    const goalType = existing?.goalType
    const goalValue = existing?.goalValue ?? 0
    const goalTitle = existing?.goalTitle || ''

    // Determine goal state based on existing data
    const hasGoalSet = Boolean(goalTitle && goalType)
    if (!hasGoalSet) {
      goalState = 'setup'
    } else if (isProgressLocked) {
      goalState = 'locked'
    } else {
      goalState = 'unlocked'
    }

    // Set type (null if not set yet)
    currentGoalType = goalType || null
    goalTypeBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.type === currentGoalType))
    milestoneInput.value = goalTitle
    notesInput.value = ''
    setGoalAccomplished(goalValue >= 100)

    // For consistency slider, value is 0-5 directly
    const sliderVal = currentGoalType === 'continuous' ? Math.min(goalValue, 5) : 0
    goalSlider.value = String(sliderVal)
    goalValueDisplay.textContent = `${sliderVal}/5`

    updateGoalUI()

    container.classList.remove('hidden')

    const currentActive = getActiveNode()
    if (currentActive) {
      currentActive.classList.remove('is-active')
    }

    setActiveNode(target)
    target.classList.add('is-active')
    reposition(target)
    labelInput.focus()
  }

  function reposition(target: HTMLButtonElement): void {
    const rect = target.getBoundingClientRect()
    const padding = 12
    const desiredX = rect.left + rect.width / 2
    const desiredY = rect.top - 10

    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width || 280
    const containerHeight = containerRect.height || 200
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    const minX = padding + containerWidth / 2
    const maxX = viewportWidth - padding - containerWidth / 2
    const minY = padding + containerHeight
    const maxY = viewportHeight - padding

    const clampedX = minX > maxX ? viewportWidth / 2 : Math.min(Math.max(desiredX, minX), maxX)
    const clampedY = minY > maxY ? viewportHeight / 2 : Math.min(Math.max(desiredY, minY), maxY)

    container.style.left = `${clampedX}px`
    container.style.top = `${clampedY}px`
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault()
    const activeNode = getActiveNode()
    if (!activeNode) return

    const nodeId = activeNode.dataset.nodeId
    if (!nodeId) return

    const rawLabel = labelInput.value.trim()
    const normalizedLabel = rawLabel.replace(/\s+/g, ' ').trim()
    const label = normalizedLabel || ''
    const note = noteInput.value.trim()
    const defaultLabel = activeNode.dataset.defaultLabel || ''
    const appliedLabel = label || defaultLabel
    const isLeaf = activeNode.classList.contains('leaf')

    // Get goal value based on type (binary: 0 or 100, continuous: 0-5)
    const goalTitle = milestoneInput.value.trim()
    const goalValue = currentGoalType === 'binary'
      ? (goalAccomplished ? 100 : 0)
      : parseInt(goalSlider.value, 10) // 0-5 for consistency
    const hasGoal = isLeaf && (goalValue > 0 || goalTitle)
    const hasContent = Boolean(label || note || hasGoal)

    // Smooth transition for leaves: fade out, update, fade in
    if (isLeaf) {
      activeNode.classList.add('is-updating')
      setTimeout(() => {
        setNodeLabel(activeNode, appliedLabel)
        activeNode.dataset.filled = hasContent ? 'true' : 'false'
        requestAnimationFrame(() => activeNode.classList.remove('is-updating'))
      }, 100)
    } else {
      setNodeLabel(activeNode, appliedLabel)
      activeNode.dataset.filled = hasContent ? 'true' : 'false'
    }

    if (hasContent) {
      nodeState[nodeId] = {
        label: appliedLabel,
        note,
        goalType: isLeaf && currentGoalType ? currentGoalType : undefined,
        goalValue: isLeaf ? goalValue : undefined,
        goalTitle: isLeaf ? goalTitle : undefined
      }
    } else {
      deleteNodeData(nodeId)
    }

    saveState(callbacks.onSave)
    callbacks.onUpdateFocus(activeNode)
    closeEditor()
  }

  function handleCancel(event: Event): void {
    event.preventDefault()
    closeEditor()
  }

  function handleClear(event: Event): void {
    event.preventDefault()
    const activeNode = getActiveNode()
    if (!activeNode) return

    const nodeId = activeNode.dataset.nodeId
    if (nodeId) deleteNodeData(nodeId)

    const isLeaf = activeNode.classList.contains('leaf')
    const defaultLabel = activeNode.dataset.defaultLabel || ''

    if (isLeaf) {
      activeNode.classList.add('is-updating')
      setTimeout(() => {
        setNodeLabel(activeNode, defaultLabel)
        activeNode.dataset.filled = 'false'
        requestAnimationFrame(() => activeNode.classList.remove('is-updating'))
      }, 100)
    } else {
      setNodeLabel(activeNode, defaultLabel)
      activeNode.dataset.filled = 'false'
    }

    saveState(callbacks.onSave)
    callbacks.onUpdateFocus(activeNode)
    closeEditor()
  }

  function handleOutside(event: MouseEvent): void {
    const activeNode = getActiveNode()
    if (!container.classList.contains('hidden') && !container.contains(event.target as Node)) {
      if (activeNode && (event.target as Node) !== activeNode) {
        closeEditor()
      }
    }
  }

  form.addEventListener('submit', handleSubmit)
  cancelButton.addEventListener('click', handleCancel)
  clearButton.addEventListener('click', handleClear)
  closeBtn.addEventListener('click', closeEditor)
  canvas.addEventListener('click', handleOutside)

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeEditor()
    }
  })

  function setProgressLocked(locked: boolean): void {
    isProgressLocked = locked
    // Update goalState if we're not in setup
    if (goalState !== 'setup') {
      goalState = locked ? 'locked' : 'unlocked'
    }
    updateGoalUI()
  }

  function setPanelLocked(locked: boolean): void {
    isPanelLocked = locked
    const activeNode = getActiveNode()
    if (!activeNode) return

    const isLeaf = activeNode.classList.contains('leaf')
    // If locked and not a leaf, close (nothing to edit)
    if (locked && !isLeaf) {
      closeEditor()
      return
    }
    // Update UI to reflect lock state for open dialog
    updatePanelLockedUI(isLeaf)
  }

  function getIsPanelLocked(): boolean {
    return isPanelLocked
  }

  return {
    container,
    open,
    reposition,
    close: closeEditor,
    setProgressLocked,
    setPanelLocked,
    getIsPanelLocked,
  }
}
