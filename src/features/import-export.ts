import type { AppContext, NodeData } from '../types'
import { nodeState, saveState, hasNodeData, runMigrations } from '../state'
import { syncNode } from '../ui/node-ui'
import { flashStatus, updateStatusMeta } from './status'
import { sanitizeSprout, sanitizeLeaf } from '../utils/validate-import'

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
  const now = new Date()
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  link.download = `trunk${timestamp}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  recordExportDate()
  flashStatus(ctx.elements, 'Exported JSON file.', 'success')
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
    const confirmed = window.confirm('Import data? This will replace all existing labels, notes, sprouts, and leaves.')
    if (!confirmed) {
      return
    }
  }

  // Show loading state
  flashStatus(ctx.elements, 'Importing...', 'info')

  try {
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      flashStatus(ctx.elements, 'Import failed: File is not valid JSON.', 'error')
      return
    }

    // Detect and handle old vs new format
    // Old format: { circles: {...} } or direct node data
    // New format: { version: N, circles: {...} } or { _version: N, nodes: {...} }
    const parsedObj = parsed as Record<string, unknown>
    const version = typeof parsedObj?.version === 'number' ? parsedObj.version : 0
    let raw = parsedObj?.circles ?? parsedObj?.nodes ?? parsed

    if (!raw || typeof raw !== 'object') {
      flashStatus(ctx.elements, 'Import failed: No valid node data found in file.', 'error')
      return
    }

    // Run schema migrations if we have version info
    if (version > 0 || parsedObj._version) {
      const migrated = runMigrations({
        _version: version || (parsedObj._version as number) || 0,
        nodes: raw as Record<string, NodeData>,
      })
      raw = migrated.nodes
    }

    const nextState: Record<string, NodeData> = {}
    Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
      if (!ctx.nodeLookup.has(key)) return
      if (!value || typeof value !== 'object') return

      const v = value as Record<string, unknown>
      const label = typeof v.label === 'string' ? v.label.trim() : ''
      const noteValue = typeof v.note === 'string' ? v.note.trim() : ''
      const detailRaw = v.detail
      const legacyDetail = typeof detailRaw === 'string' ? detailRaw.trim() : ''
      const note = noteValue || legacyDetail

      // Extract and sanitize sprouts
      const sprouts = Array.isArray(v.sprouts)
        ? v.sprouts.map(sanitizeSprout).filter((s): s is NonNullable<typeof s> => s !== null)
        : undefined

      // Extract and sanitize leaves
      const leaves = Array.isArray(v.leaves)
        ? v.leaves.map(sanitizeLeaf).filter((l): l is NonNullable<typeof l> => l !== null)
        : undefined

      // Skip nodes with no meaningful data
      const hasData = label || note || (sprouts && sprouts.length > 0) || (leaves && leaves.length > 0)
      if (!hasData) return

      const defaultLabel = ctx.nodeLookup.get(key)?.dataset.defaultLabel || ''
      nextState[key] = {
        label: label || defaultLabel,
        note,
        ...(sprouts && sprouts.length > 0 ? { sprouts } : {}),
        ...(leaves && leaves.length > 0 ? { leaves } : {}),
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
    console.error('Import error:', error)
    flashStatus(ctx.elements, 'Import failed: An unexpected error occurred.', 'error')
  }
}
