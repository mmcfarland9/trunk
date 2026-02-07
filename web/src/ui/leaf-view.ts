import type { LeafViewApi, Sprout, SproutSeason, SproutEnvironment } from '../types'
import { escapeHtml } from '../utils/escape-html'
import {
  getSeasonLabel,
  getEnvironmentLabel,
  getResultEmoji,
} from '../utils/sprout-labels'
import {
  getState,
  getSproutsByLeaf,
  toSprout,
} from '../events'

type LeafViewCallbacks = {
  onClose: () => void
  onSave: () => void
  onSoilChange?: () => void
}

// Unified log entry types
type LogEntryType = 'sprout-start' | 'watering' | 'completion'

type LogEntry = {
  type: LogEntryType
  timestamp: string
  sproutId: string
  sproutTitle: string
  data: {
    season?: SproutSeason
    environment?: SproutEnvironment
    content?: string
    prompt?: string
    result?: number
    reflection?: string
    isSuccess?: boolean
    bloomWither?: string
    bloomBudding?: string
    bloomFlourish?: string
  }
}

// Labels and emojis imported from ../utils/sprout-labels

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day}/${year} ${time}`
}

export function buildLeafView(mapPanel: HTMLElement, callbacks: LeafViewCallbacks): LeafViewApi {
  const container = document.createElement('div')
  container.className = 'leaf-view'

  container.innerHTML = `
    <div class="leaf-view-box">
      <button type="button" class="leaf-close-btn">× close</button>
      <div class="leaf-view-body">
        <div class="leaf-log"></div>
      </div>
    </div>
  `

  mapPanel.append(container)

  // Element references
  const backBtn = container.querySelector<HTMLButtonElement>('.leaf-close-btn')!
  const logEl = container.querySelector<HTMLDivElement>('.leaf-log')!

  // State
  let currentLeafId: string | null = null

  function getSprouts(): Sprout[] {
    if (!currentLeafId) return []
    const state = getState()
    const derivedSprouts = getSproutsByLeaf(state, currentLeafId)
    return derivedSprouts.map(toSprout)
  }

  // Build unified log from all sprouts and their events
  function buildUnifiedLog(sprouts: Sprout[]): LogEntry[] {
    const entries: LogEntry[] = []

    for (const sprout of sprouts) {
      // Sprout start event
      entries.push({
        type: 'sprout-start',
        timestamp: sprout.activatedAt || sprout.createdAt,
        sproutId: sprout.id,
        sproutTitle: sprout.title,
        data: {
          season: sprout.season,
          environment: sprout.environment,
          bloomWither: sprout.bloomWither,
          bloomBudding: sprout.bloomBudding,
          bloomFlourish: sprout.bloomFlourish,
        }
      })

      // Watering entries
      for (const water of sprout.waterEntries || []) {
        entries.push({
          type: 'watering',
          timestamp: water.timestamp,
          sproutId: sprout.id,
          sproutTitle: sprout.title,
          data: {
            content: water.content,
            prompt: water.prompt,
          }
        })
      }

      // Completion event
      if (sprout.completedAt) {
        entries.push({
          type: 'completion',
          timestamp: sprout.completedAt,
          sproutId: sprout.id,
          sproutTitle: sprout.title,
          data: {
            result: sprout.result,
            reflection: sprout.reflection,
            isSuccess: sprout.state === 'completed',
          }
        })
      }
    }

    // Sort by timestamp descending (most recent first)
    return entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  function renderLogEntry(entry: LogEntry): string {
    const timeStr = formatDateTime(entry.timestamp)

    switch (entry.type) {
      case 'sprout-start': {
        const hasBloom = entry.data.bloomWither || entry.data.bloomBudding || entry.data.bloomFlourish
        const bloomHtml = hasBloom ? `
          <p class="log-entry-bloom">
            ${entry.data.bloomWither ? `<span class="bloom-item">🥀 <em>${escapeHtml(entry.data.bloomWither)}</em></span>` : ''}
            ${entry.data.bloomBudding ? `<span class="bloom-item">🌱 <em>${escapeHtml(entry.data.bloomBudding)}</em></span>` : ''}
            ${entry.data.bloomFlourish ? `<span class="bloom-item">🌲 <em>${escapeHtml(entry.data.bloomFlourish)}</em></span>` : ''}
          </p>
        ` : ''
        return `
          <div class="log-entry log-entry-start" data-sprout-id="${escapeHtml(entry.sproutId)}">
            <div class="log-entry-header">
              <span class="log-entry-type">Planted</span>
              <span class="log-entry-time">${timeStr}</span>
            </div>
            <p class="log-entry-title">${escapeHtml(entry.sproutTitle)}</p>
            <p class="log-entry-meta">${getSeasonLabel(entry.data.season!)} · ${getEnvironmentLabel(entry.data.environment!)}</p>
            ${bloomHtml}
          </div>
        `
      }

      case 'watering':
        return `
          <div class="log-entry log-entry-water" data-sprout-id="${escapeHtml(entry.sproutId)}">
            <div class="log-entry-header">
              <span class="log-entry-type">Watered</span>
              <span class="log-entry-time">${timeStr}</span>
            </div>
            ${entry.data.prompt ? `<p class="log-entry-prompt">${escapeHtml(entry.data.prompt)}</p>` : ''}
            <p class="log-entry-content">${escapeHtml(entry.data.content || '')}</p>
          </div>
        `

      case 'completion': {
        const isCompleted = entry.data.isSuccess
        const emoji = getResultEmoji(entry.data.result || 1)

        return `
          <div class="log-entry log-entry-completion ${isCompleted ? 'is-success' : 'is-failed'}" data-sprout-id="${escapeHtml(entry.sproutId)}">
            <div class="log-entry-header">
              <span class="log-entry-type">${isCompleted ? 'Harvested' : 'Pruned'}</span>
              <span class="log-entry-time">${timeStr}</span>
            </div>
            <p class="log-entry-title">${escapeHtml(entry.sproutTitle)}</p>
            <p class="log-entry-result">${emoji} ${entry.data.result}/5</p>
            ${entry.data.reflection ? `<p class="log-entry-reflection">"${escapeHtml(entry.data.reflection)}"</p>` : ''}
          </div>
        `
      }

      default:
        return ''
    }
  }

  function render(): void {
    const sprouts = getSprouts()

    // If no sprouts, show empty state
    if (sprouts.length === 0) {
      logEl.innerHTML = '<p class="log-empty">No activity yet.</p>'
      return
    }

    const logEntries = buildUnifiedLog(sprouts)

    if (logEntries.length === 0) {
      logEl.innerHTML = '<p class="log-empty">No activity yet.</p>'
      return
    }

    // Render all log entries
    logEl.innerHTML = logEntries.map(e => renderLogEntry(e)).join('')
  }

  // Event handlers
  backBtn.addEventListener('click', () => {
    callbacks.onClose()
  })

  function isOpen(): boolean {
    return container.classList.contains('is-open')
  }

  // Keyboard navigation - on document to ensure we catch Escape regardless of focus
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault()
      e.stopImmediatePropagation()
      callbacks.onClose()
    }
  })

  return {
    container,
    open(leafId: string, _twigId: string, _branchIndex: number) {
      currentLeafId = leafId
      render()
      container.classList.add('is-open')
    },
    close() {
      container.classList.remove('is-open')
      currentLeafId = null
    },
    isOpen,
  }
}
