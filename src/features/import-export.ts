import type { AppContext, NodeData } from '../types'
import { nodeState, saveState, clearState, hasNodeData } from '../state'
import { syncNode, setNodeLabel, setFocusedNode, updateFocus } from '../ui/node-ui'
import { flashStatus, updateStatusMeta } from './status'

const EXPORT_REMINDER_KEY = 'trunk-last-export'
const REMINDER_DAYS = 7

export type ImportExportCallbacks = {
  onUpdateStats: () => void
  onSetViewMode: (mode: 'overview') => void
}

function recordExportDate(): void {
  try {
    localStorage.setItem(EXPORT_REMINDER_KEY, new Date().toISOString())
  } catch {
    // Ignore storage errors
  }
}

function getLastExportDate(): Date | null {
  try {
    const raw = localStorage.getItem(EXPORT_REMINDER_KEY)
    if (raw) return new Date(raw)
  } catch {
    // Ignore storage errors
  }
  return null
}

export function checkExportReminder(ctx: AppContext): void {
  if (!hasNodeData()) return // No data to back up

  const lastExport = getLastExportDate()
  if (!lastExport) {
    // Never exported - gentle reminder after they have data
    flashStatus(ctx.elements, 'Tip: Export your data regularly for backup.', 'info')
    return
  }

  const daysSinceExport = Math.floor((Date.now() - lastExport.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceExport >= REMINDER_DAYS) {
    flashStatus(ctx.elements, `It's been ${daysSinceExport} days since your last export.`, 'info')
  }
}

export function handleExport(ctx: AppContext): void {
  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    circles: nodeState,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'trunk-map.json'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  recordExportDate()
  flashStatus(ctx.elements, 'Exported JSON file.', 'success')
}

export function handleReset(ctx: AppContext, callbacks: ImportExportCallbacks): void {
  const confirmed = window.confirm('Reset all notes? This clears every label and note in the map.')
  if (!confirmed) return

  clearState()

  ctx.allNodes.forEach((node) => {
    setNodeLabel(node, node.dataset.defaultLabel || '')
    node.dataset.filled = 'false'
  })

  callbacks.onSetViewMode('overview')
  setFocusedNode(null, ctx, () => {})
  updateFocus(null, ctx)
  callbacks.onUpdateStats()
  updateStatusMeta(ctx.elements)
  flashStatus(ctx.elements, 'Map reset to a clean slate.', 'warning')
}

export async function handleImport(
  ctx: AppContext,
  callbacks: ImportExportCallbacks
): Promise<void> {
  const { importInput } = ctx.elements
  const file = importInput.files?.[0]
  if (!file) return

  importInput.value = ''

  if (hasNodeData()) {
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

    const nextState: Record<string, NodeData> = {}
    Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
      if (!ctx.nodeLookup.has(key)) return
      if (!value || typeof value !== 'object') return

      const label = typeof (value as NodeData).label === 'string' ? (value as NodeData).label.trim() : ''
      const noteValue = typeof (value as NodeData).note === 'string' ? (value as NodeData).note.trim() : ''
      const detailRaw = (value as { detail?: unknown }).detail
      const legacyDetail = typeof detailRaw === 'string' ? detailRaw.trim() : ''
      const note = noteValue || legacyDetail

      if (!label && !note) return

      const defaultLabel = ctx.nodeLookup.get(key)?.dataset.defaultLabel || ''
      nextState[key] = {
        label: label || defaultLabel,
        note,
      }
    })

    Object.keys(nodeState).forEach((key) => delete nodeState[key])
    Object.entries(nextState).forEach(([key, value]) => {
      nodeState[key] = value
    })

    ctx.allNodes.forEach((node) => syncNode(node))

    ctx.editor.close()
    saveState(() => updateStatusMeta(ctx.elements, true))
    callbacks.onUpdateStats()
    flashStatus(ctx.elements, 'Import complete. Notes applied.', 'success')
  } catch (error) {
    console.error(error)
    flashStatus(ctx.elements, 'Import failed. Check the JSON format.', 'error')
  }
}
