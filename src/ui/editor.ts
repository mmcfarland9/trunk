import type { EditorApi } from '../types'
import {
  circleState,
  saveState,
  deleteCircleData,
  setActiveCircle,
  getActiveCircle,
} from '../state'
import { setCircleLabel } from './circle-ui'

export type EditorCallbacks = {
  onSave: () => void
  onUpdateFocus: (target: HTMLButtonElement | null) => void
}

export function buildEditor(canvas: HTMLDivElement, callbacks: EditorCallbacks): EditorApi {
  const container = document.createElement('div')
  container.className = 'circle-editor hidden'

  container.innerHTML = `
    <form class="editor-card" novalidate>
      <label class="editor-label">
        <span class="editor-label-text">Label (one word, 20 chars max)</span>
        <input class="editor-input" name="label" type="text" maxlength="20" />
      </label>
      <label class="editor-label">
        Notes
        <textarea class="editor-textarea" name="note" rows="4" placeholder="Add description..."></textarea>
      </label>
      <div class="editor-actions">
        <button type="button" class="editor-clear">Clear</button>
        <button type="button" class="editor-cancel">Cancel</button>
        <button type="submit" class="editor-save">Save</button>
      </div>
    </form>
  `

  const form = container.querySelector<HTMLFormElement>('form')!
  const labelText = container.querySelector<HTMLSpanElement>('.editor-label-text')!
  const noteInput = container.querySelector<HTMLTextAreaElement>('.editor-textarea')!
  const labelInput = container.querySelector<HTMLInputElement>('.editor-input')!
  const clearButton = container.querySelector<HTMLButtonElement>('.editor-clear')!
  const cancelButton = container.querySelector<HTMLButtonElement>('.editor-cancel')!

  function closeEditor(): void {
    container.classList.add('hidden')
    const active = getActiveCircle()
    if (active) {
      active.classList.remove('is-active')
    }
    setActiveCircle(null)
  }

  function open(target: HTMLButtonElement, placeholder: string): void {
    const circleId = target.dataset.circleId
    if (!circleId) return

    const isLeaf = target.classList.contains('sub-circle')
    labelText.textContent = isLeaf ? 'Leaf Title' : 'Label (one word, 20 chars max)'
    labelInput.placeholder = isLeaf ? 'Add title...' : placeholder
    noteInput.placeholder = isLeaf ? 'Add description...' : 'Add context'

    const defaultLabel = target.dataset.defaultLabel || ''
    const existing = circleState[circleId]
    const savedLabel = existing?.label || ''

    labelInput.value = savedLabel && savedLabel !== defaultLabel ? savedLabel : ''
    noteInput.value = existing?.note || ''

    container.classList.remove('hidden')

    const currentActive = getActiveCircle()
    if (currentActive) {
      currentActive.classList.remove('is-active')
    }

    setActiveCircle(target)
    target.classList.add('is-active')
    reposition(target)
    labelInput.focus()
  }

  function reposition(target: HTMLButtonElement): void {
    const rect = target.getBoundingClientRect()
    const canvasRect = canvas.getBoundingClientRect()
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

    container.style.left = `${clampedX - canvasRect.left}px`
    container.style.top = `${clampedY - canvasRect.top}px`
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault()
    const activeCircle = getActiveCircle()
    if (!activeCircle) return

    const circleId = activeCircle.dataset.circleId
    if (!circleId) return

    const rawLabel = labelInput.value.trim()
    const normalizedLabel = rawLabel.replace(/\s+/g, ' ').trim()
    const isLeaf = activeCircle.classList.contains('sub-circle')
    const label = normalizedLabel
      ? (isLeaf ? normalizedLabel.slice(0, 20) : normalizedLabel.split(' ')[0].slice(0, 20))
      : ''
    const note = noteInput.value.trim()
    const defaultLabel = activeCircle.dataset.defaultLabel || ''
    const appliedLabel = label || defaultLabel

    setCircleLabel(activeCircle, appliedLabel)

    const hasContent = Boolean(label || note)
    activeCircle.dataset.filled = hasContent ? 'true' : 'false'

    if (hasContent) {
      circleState[circleId] = {
        label: appliedLabel,
        note,
      }
    } else {
      deleteCircleData(circleId)
    }

    saveState(callbacks.onSave)
    callbacks.onUpdateFocus(activeCircle)
    closeEditor()
  }

  function handleCancel(event: Event): void {
    event.preventDefault()
    closeEditor()
  }

  function handleClear(event: Event): void {
    event.preventDefault()
    const activeCircle = getActiveCircle()
    if (!activeCircle) return

    const circleId = activeCircle.dataset.circleId
    if (circleId) {
      deleteCircleData(circleId)
    }

    setCircleLabel(activeCircle, activeCircle.dataset.defaultLabel || '')
    activeCircle.dataset.filled = 'false'

    saveState(callbacks.onSave)
    callbacks.onUpdateFocus(activeCircle)
    closeEditor()
  }

  function handleOutside(event: MouseEvent): void {
    const activeCircle = getActiveCircle()
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
