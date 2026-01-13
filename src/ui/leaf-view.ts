import type { LeafViewApi, Sprout, Leaf, WaterEntry, SproutSeason, SproutEnvironment } from '../types'
import {
  nodeState,
  getLeafById,
  getSproutsByLeaf,
  getLeafWaterEntries,
  getActiveSprouts,
  graftSprout,
  calculateSoilCost,
  getSoilAvailable,
  canAffordSoil,
  spendSoil,
  getDebugNow,
} from '../state'

export type LeafViewCallbacks = {
  onClose: () => void
  onSave: () => void
  onSoilChange?: () => void
}

const SEASONS: SproutSeason[] = ['1w', '2w', '1m', '3m', '6m', '1y']
const ENVIRONMENTS: SproutEnvironment[] = ['fertile', 'firm', 'barren']

function getSeasonLabel(season: SproutSeason): string {
  const labels: Record<SproutSeason, string> = {
    '1w': '1 week',
    '2w': '2 weeks',
    '1m': '1 month',
    '3m': '3 months',
    '6m': '6 months',
    '1y': '1 year',
  }
  return labels[season]
}

function getEnvironmentLabel(env: SproutEnvironment): string {
  const labels: Record<SproutEnvironment, string> = {
    fertile: 'Fertile',
    firm: 'Firm',
    barren: 'Barren',
  }
  return labels[env]
}

function getResultEmoji(result: number): string {
  const emojis: Record<number, string> = {
    1: '🥀',
    2: '🌱',
    3: '🌿',
    4: '🌳',
    5: '🌲',
  }
  return emojis[result] || '🌱'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = getDebugNow()
  const diff = now - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return formatDate(date)
}

function getEndDate(season: SproutSeason, startDate: Date = new Date()): Date {
  const end = new Date(startDate)
  switch (season) {
    case '1w': end.setDate(end.getDate() + 7); break
    case '2w': end.setDate(end.getDate() + 14); break
    case '1m': end.setMonth(end.getMonth() + 1); break
    case '3m': end.setMonth(end.getMonth() + 3); break
    case '6m': end.setMonth(end.getMonth() + 6); break
    case '1y': end.setFullYear(end.getFullYear() + 1); break
  }
  end.setUTCHours(15, 0, 0, 0)
  return end
}

export function buildLeafView(mapPanel: HTMLElement, callbacks: LeafViewCallbacks): LeafViewApi {
  const container = document.createElement('div')
  container.className = 'leaf-view hidden'

  container.innerHTML = `
    <div class="leaf-view-header">
      <button type="button" class="leaf-back-btn">< back to twig</button>
      <div class="leaf-title-section">
        <h2 class="leaf-title"></h2>
        <p class="leaf-meta"></p>
      </div>
    </div>
    <div class="leaf-view-body">
      <div class="leaf-column leaf-timeline">
        <h3 class="column-title">Sprout Timeline</h3>
        <div class="leaf-timeline-list"></div>
      </div>
      <div class="leaf-column leaf-journal">
        <h3 class="column-title">Watering Journal</h3>
        <div class="leaf-journal-list"></div>
      </div>
    </div>
    <div class="leaf-view-footer">
      <div class="leaf-graft-form hidden">
        <h4 class="graft-form-title">Graft from completed sprout</h4>
        <input type="text" class="graft-title-input" placeholder="Continue the journey..." maxlength="60" />
        <label class="sprout-field-label">Season</label>
        <div class="graft-season-selector">
          ${SEASONS.map(s => `<button type="button" class="graft-season-btn" data-season="${s}">${s}</button>`).join('')}
        </div>
        <label class="sprout-field-label">Environment</label>
        <div class="graft-environment-selector">
          ${ENVIRONMENTS.map(e => `<button type="button" class="graft-env-btn" data-env="${e}">${getEnvironmentLabel(e)}</button>`).join('')}
        </div>
        <div class="graft-soil-cost"></div>
        <div class="graft-actions">
          <button type="button" class="graft-cancel-btn">Cancel</button>
          <button type="button" class="graft-confirm-btn" disabled>Graft</button>
        </div>
      </div>
      <button type="button" class="leaf-graft-btn">+ Graft New Sprout</button>
    </div>
  `

  mapPanel.append(container)

  // Element references
  const backBtn = container.querySelector<HTMLButtonElement>('.leaf-back-btn')!
  const titleEl = container.querySelector<HTMLHeadingElement>('.leaf-title')!
  const metaEl = container.querySelector<HTMLParagraphElement>('.leaf-meta')!
  const timelineList = container.querySelector<HTMLDivElement>('.leaf-timeline-list')!
  const journalList = container.querySelector<HTMLDivElement>('.leaf-journal-list')!
  const graftBtn = container.querySelector<HTMLButtonElement>('.leaf-graft-btn')!
  const graftForm = container.querySelector<HTMLDivElement>('.leaf-graft-form')!
  const graftTitleInput = container.querySelector<HTMLInputElement>('.graft-title-input')!
  const graftSeasonBtns = container.querySelectorAll<HTMLButtonElement>('.graft-season-btn')
  const graftEnvBtns = container.querySelectorAll<HTMLButtonElement>('.graft-env-btn')
  const graftSoilCost = container.querySelector<HTMLDivElement>('.graft-soil-cost')!
  const graftCancelBtn = container.querySelector<HTMLButtonElement>('.graft-cancel-btn')!
  const graftConfirmBtn = container.querySelector<HTMLButtonElement>('.graft-confirm-btn')!

  // State
  let currentTwigId: string | null = null
  let currentLeafId: string | null = null
  let selectedSeason: SproutSeason | null = null
  let selectedEnvironment: SproutEnvironment | null = null
  let graftFromSproutId: string | null = null

  function getLeaf(): Leaf | undefined {
    if (!currentTwigId || !currentLeafId) return undefined
    return getLeafById(currentTwigId, currentLeafId)
  }

  function getSprouts(): Sprout[] {
    if (!currentTwigId || !currentLeafId) return []
    const data = nodeState[currentTwigId]
    if (!data?.sprouts) return []
    return getSproutsByLeaf(data.sprouts, currentLeafId)
  }

  function getWaterEntries(): Array<WaterEntry & { sproutId: string; sproutTitle: string }> {
    if (!currentTwigId || !currentLeafId) return []
    return getLeafWaterEntries(currentTwigId, currentLeafId)
  }

  function renderTimeline(): void {
    const sprouts = getSprouts()

    // Sort by creation date, oldest first
    const sorted = [...sprouts].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    if (sorted.length === 0) {
      timelineList.innerHTML = '<p class="leaf-empty">No sprouts in this leaf yet.</p>'
      return
    }

    timelineList.innerHTML = sorted.map((sprout, index) => {
      const isActive = sprout.state === 'active'
      const isCompleted = sprout.state === 'completed'
      const isFailed = sprout.state === 'failed'
      const resultEmoji = sprout.result ? getResultEmoji(sprout.result) : '🌱'
      const dateStr = sprout.completedAt
        ? formatDate(new Date(sprout.completedAt))
        : sprout.activatedAt
          ? formatDate(new Date(sprout.activatedAt))
          : formatDate(new Date(sprout.createdAt))

      const graftedFrom = sprout.graftedFromId
        ? sorted.find(s => s.id === sprout.graftedFromId)
        : null

      return `
        <div class="timeline-item ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''} ${isFailed ? 'is-failed' : ''}" data-sprout-id="${sprout.id}">
          <div class="timeline-marker">
            <span class="timeline-number">${index + 1}</span>
            ${!isActive ? `<span class="timeline-emoji">${resultEmoji}</span>` : '<span class="timeline-emoji">🌱</span>'}
          </div>
          <div class="timeline-content">
            <p class="timeline-title">${sprout.title}</p>
            <p class="timeline-meta">
              ${getSeasonLabel(sprout.season)} · ${getEnvironmentLabel(sprout.environment)}
              ${sprout.result ? ` · ${sprout.result}/5` : ''}
            </p>
            <p class="timeline-date">${dateStr}</p>
            ${graftedFrom ? `<p class="timeline-grafted">Grafted from: ${graftedFrom.title}</p>` : ''}
            ${sprout.reflection ? `<p class="timeline-reflection">"${sprout.reflection}"</p>` : ''}
            ${isCompleted ? `<button type="button" class="timeline-graft-btn" data-sprout-id="${sprout.id}">+ Graft</button>` : ''}
          </div>
        </div>
      `
    }).join('')

    // Wire up graft buttons on completed sprouts
    timelineList.querySelectorAll<HTMLButtonElement>('.timeline-graft-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sproutId = btn.dataset.sproutId
        if (sproutId) {
          graftFromSproutId = sproutId
          showGraftForm()
        }
      })
    })
  }

  function renderJournal(): void {
    const entries = getWaterEntries()

    if (entries.length === 0) {
      journalList.innerHTML = '<p class="leaf-empty">No journal entries yet. Water your sprouts to add entries.</p>'
      return
    }

    journalList.innerHTML = entries.map(entry => `
      <div class="journal-entry">
        <div class="journal-entry-header">
          <span class="journal-entry-sprout">${entry.sproutTitle}</span>
          <span class="journal-entry-date">${formatRelativeDate(entry.timestamp)}</span>
        </div>
        ${entry.prompt ? `<p class="journal-entry-prompt">${entry.prompt}</p>` : ''}
        <p class="journal-entry-content">${entry.content}</p>
      </div>
    `).join('')
  }

  function render(): void {
    const leaf = getLeaf()
    if (!leaf) return

    const sprouts = getSprouts()
    const active = getActiveSprouts(sprouts)
    const completed = sprouts.filter(s => s.state === 'completed')

    // Get title from the most recent sprout (the "top layer")
    const sortedSprouts = [...sprouts].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const topSprout = sortedSprouts[0]
    titleEl.textContent = topSprout?.title || 'Untitled Saga'
    metaEl.textContent = `${sprouts.length} sprout${sprouts.length !== 1 ? 's' : ''} · ${active.length} active · ${completed.length} completed`

    renderTimeline()
    renderJournal()

    // Show/hide graft button based on whether there are completed sprouts
    graftBtn.style.display = completed.length > 0 ? '' : 'none'
  }

  function showGraftForm(): void {
    graftForm.classList.remove('hidden')
    graftBtn.classList.add('hidden')
    graftTitleInput.focus()
    updateGraftFormState()
  }

  function hideGraftForm(): void {
    graftForm.classList.add('hidden')
    graftBtn.classList.remove('hidden')
    resetGraftForm()
  }

  function resetGraftForm(): void {
    graftTitleInput.value = ''
    selectedSeason = null
    selectedEnvironment = null
    graftFromSproutId = null
    graftSeasonBtns.forEach(btn => btn.classList.remove('is-selected'))
    graftEnvBtns.forEach(btn => btn.classList.remove('is-selected'))
    updateGraftFormState()
  }

  function updateGraftFormState(): void {
    const title = graftTitleInput.value.trim()
    const hasAllFields = title && selectedSeason && selectedEnvironment

    if (selectedSeason && selectedEnvironment) {
      const cost = calculateSoilCost(selectedSeason, selectedEnvironment)
      const available = getSoilAvailable()
      const canAfford = canAffordSoil(cost)
      graftSoilCost.textContent = `Cost: ${cost} soil (${available} available)`
      graftSoilCost.classList.toggle('is-warning', !canAfford)
      graftConfirmBtn.disabled = !hasAllFields || !canAfford
    } else {
      graftSoilCost.textContent = ''
      graftConfirmBtn.disabled = true
    }
  }

  function doGraft(): void {
    if (!currentTwigId || !graftFromSproutId || !selectedSeason || !selectedEnvironment) return

    const title = graftTitleInput.value.trim()
    if (!title) return

    const cost = calculateSoilCost(selectedSeason, selectedEnvironment)
    if (!canAffordSoil(cost)) return

    // Spend soil
    spendSoil(cost)
    callbacks.onSoilChange?.()

    // Create the grafted sprout
    const endDate = getEndDate(selectedSeason)
    const now = new Date().toISOString()

    graftSprout(currentTwigId, graftFromSproutId, {
      title,
      season: selectedSeason,
      environment: selectedEnvironment,
      state: 'active',
      soilCost: cost,
      activatedAt: now,
      endDate: endDate.toISOString(),
    })

    hideGraftForm()
    render()
    callbacks.onSave()
  }

  // Event handlers
  backBtn.addEventListener('click', () => {
    callbacks.onClose()
  })

  graftBtn.addEventListener('click', () => {
    // Find the most recent completed sprout to graft from
    const sprouts = getSprouts()
    const completed = sprouts.filter(s => s.state === 'completed')
    if (completed.length > 0) {
      // Sort by completion date, get most recent
      completed.sort((a, b) =>
        new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
      )
      graftFromSproutId = completed[0].id
      showGraftForm()
    }
  })

  graftCancelBtn.addEventListener('click', hideGraftForm)

  graftTitleInput.addEventListener('input', updateGraftFormState)

  graftSeasonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      graftSeasonBtns.forEach(b => b.classList.remove('is-selected'))
      btn.classList.add('is-selected')
      selectedSeason = btn.dataset.season as SproutSeason
      updateGraftFormState()
    })
  })

  graftEnvBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      graftEnvBtns.forEach(b => b.classList.remove('is-selected'))
      btn.classList.add('is-selected')
      selectedEnvironment = btn.dataset.env as SproutEnvironment
      updateGraftFormState()
    })
  })

  graftConfirmBtn.addEventListener('click', doGraft)

  // Keyboard navigation
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!graftForm.classList.contains('hidden')) {
        hideGraftForm()
      } else {
        callbacks.onClose()
      }
      e.preventDefault()
    }
  })

  return {
    container,
    open(leafId: string, twigId: string, _branchIndex: number) {
      currentLeafId = leafId
      currentTwigId = twigId
      resetGraftForm()
      render()
      container.classList.remove('hidden')
    },
    close() {
      container.classList.add('hidden')
      currentLeafId = null
      currentTwigId = null
    },
    isOpen() {
      return !container.classList.contains('hidden')
    },
  }
}
