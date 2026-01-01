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
    <form class="editor-card" novalidate>
      <label class="editor-label">
        <span class="editor-label-text">Label</span>
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
    const active = getActiveNode()
    if (active) {
      active.classList.remove('is-active')
    }
    setActiveNode(null)
  }

  function open(target: HTMLButtonElement, placeholder: string): void {
    const nodeId = target.dataset.nodeId
    if (!nodeId) return

    const isLeaf = target.classList.contains('leaf')
    labelText.textContent = isLeaf ? 'Leaf Title' : 'Label'
    labelInput.placeholder = isLeaf ? 'Add title...' : placeholder
    noteInput.placeholder = isLeaf ? 'Add description...' : 'Add context'

    const defaultLabel = target.dataset.defaultLabel || ''
    const existing = nodeState[nodeId]
    const savedLabel = existing?.label || ''

    labelInput.value = savedLabel && savedLabel !== defaultLabel ? savedLabel : ''
    noteInput.value = existing?.note || ''

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

    setNodeLabel(activeNode, appliedLabel)

    const hasContent = Boolean(label || note)
    activeNode.dataset.filled = hasContent ? 'true' : 'false'

    if (hasContent) {
      nodeState[nodeId] = {
        label: appliedLabel,
        note,
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
    if (nodeId) {
      deleteNodeData(nodeId)
    }

    setNodeLabel(activeNode, activeNode.dataset.defaultLabel || '')
    activeNode.dataset.filled = 'false'

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
