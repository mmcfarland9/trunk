import type { AppContext, CircleData } from '../types'
import { circleState, saveState, clearState, hasCircleData } from '../state'
import { syncCircle, setCircleLabel, setFocusedCircle, updateFocus } from '../ui'
import { flashStatus, updateStatusMeta } from './status'
import { getBranchLabel } from './progress'

export type ImportExportCallbacks = {
  onUpdateStats: () => void
  onSetViewMode: (mode: 'overview') => void
}

export function handleExport(ctx: AppContext): void {
  const payload = {
    version: 3,
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
  flashStatus(ctx.elements, 'Exported JSON file.', 'success')
}

export async function handleCopySummary(ctx: AppContext): Promise<void> {
  const summary = buildSummary(ctx)
  if (!summary.trim()) {
    flashStatus(ctx.elements, 'Nothing to copy yet.', 'warning')
    return
  }

  try {
    await navigator.clipboard.writeText(summary)
    flashStatus(ctx.elements, 'Summary copied to clipboard.', 'success')
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
    flashStatus(ctx.elements, 'Summary copied with fallback.', 'success')
  }
}

export function buildSummary(ctx: AppContext): string {
  const { branches } = ctx
  const lines: string[] = []
  const purpose = circleState.center

  if (purpose?.label || purpose?.note) {
    const title = purpose.label || 'Purpose'
    lines.push(`Purpose: ${title}`)
    if (purpose.note) {
      lines.push(`${purpose.note}`)
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

    if (mainData?.note) {
      lines.push(`  Note: ${mainData.note}`)
    }

    subEntries.forEach((entry) => {
      const subLabel = entry.data?.label?.trim() || `Leaf ${entry.index + 1}`
      if (entry.data?.note) {
        lines.push(`  - ${subLabel}: ${entry.data.note}`)
      } else {
        lines.push(`  - ${subLabel}`)
      }
    })

    lines.push('')
  })

  return lines.join('\n').trim()
}

export function handleReset(ctx: AppContext, callbacks: ImportExportCallbacks): void {
  const confirmed = window.confirm('Reset all notes? This clears every label and note in the map.')
  if (!confirmed) return

  clearState()

  ctx.allCircles.forEach((circle) => {
    setCircleLabel(circle, circle.dataset.defaultLabel || '')
    circle.dataset.filled = 'false'
  })

  syncCircle(ctx.elements.center)

  callbacks.onSetViewMode('overview')
  setFocusedCircle(null, ctx, () => {})
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

  if (hasCircleData()) {
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
      if (!ctx.circleLookup.has(key)) return
      if (!value || typeof value !== 'object') return

      const label = typeof (value as CircleData).label === 'string' ? (value as CircleData).label.trim() : ''
      const noteValue = typeof (value as CircleData).note === 'string' ? (value as CircleData).note.trim() : ''
      const legacyDetail =
        typeof (value as { detail?: unknown }).detail === 'string'
          ? (value as { detail?: unknown }).detail.trim()
          : ''
      const note = noteValue || legacyDetail

      if (!label && !note) return

      const defaultLabel = ctx.circleLookup.get(key)?.dataset.defaultLabel || ''
      nextState[key] = {
        label: label || defaultLabel,
        note,
      }
    })

    // Clear and repopulate circleState
    Object.keys(circleState).forEach((key) => delete circleState[key])
    Object.entries(nextState).forEach(([key, value]) => {
      circleState[key] = value
    })

    ctx.allCircles.forEach((circle) => syncCircle(circle))
    syncCircle(ctx.elements.center)

    ctx.editor.close()
    saveState(() => updateStatusMeta(ctx.elements))
    callbacks.onUpdateStats()
    flashStatus(ctx.elements, 'Import complete. Notes applied.', 'success')
  } catch (error) {
    console.error(error)
    flashStatus(ctx.elements, 'Import failed. Check the JSON format.', 'error')
  }
}
