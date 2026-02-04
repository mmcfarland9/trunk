import type { EditorApi } from '../types'
import { setActiveNode, getActiveNode, getPresetLabel } from '../state'

export type EditorCallbacks = {
  onSave: () => void
  onUpdateFocus: (target: HTMLButtonElement | null) => void
}

// Editor is now only for trunk and branch nodes (label + note editing)
// Leaf editing is handled by the leaf-view component
export function buildEditor(canvas: HTMLDivElement, _callbacks: EditorCallbacks): EditorApi {
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
      <div class="editor-actions">
        <button type="button" class="editor-clear">Clear</button>
        <button type="button" class="editor-cancel">Cancel</button>
        <button type="submit" class="editor-save">Save</button>
      </div>
    </form>
  `

  const form = container.querySelector<HTMLFormElement>('form')!
  const closeBtn = container.querySelector<HTMLButtonElement>('.editor-close-btn')!
  const labelText = container.querySelector<HTMLSpanElement>('.editor-label-text')!
  const noteInput = container.querySelector<HTMLTextAreaElement>('.editor-textarea')!
  const labelInput = container.querySelector<HTMLInputElement>('input[name="label"]')!
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

    // Editor is only for trunk and branch nodes (leaves use leaf-view)
    const isLeaf = target.classList.contains('leaf')
    if (isLeaf) return

    const isTrunk = target.classList.contains('trunk')
    labelText.textContent = isTrunk ? 'Trunk' : 'Branch'
    labelInput.placeholder = placeholder
    noteInput.placeholder = 'Add details...'

    // Labels are now preset-only (from shared constants)
    const presetLabel = getPresetLabel(nodeId)
    labelInput.value = presetLabel
    noteInput.value = ''
    labelInput.disabled = true // Presets are read-only
    noteInput.disabled = true

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
    // Labels are now preset-only, nothing to save
    closeEditor()
  }

  function handleCancel(event: Event): void {
    event.preventDefault()
    closeEditor()
  }

  function handleClear(event: Event): void {
    event.preventDefault()
    // Labels are preset-only, nothing to clear
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

  return {
    container,
    open,
    reposition,
    close: closeEditor,
  }
}
