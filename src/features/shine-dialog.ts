import type { AppContext, SunEntry } from '../types'
import sunPromptsRaw from '../assets/sun-prompts.txt?raw'
import { nodeState, spendSun, canAffordSun, addSunEntry, getSunAvailable, wasShoneThisWeek, getPresetLabel, getTwigLeaves, recoverSoil, getSunRecoveryRate } from '../state'

export type ShineCallbacks = {
  onSunMeterChange: () => void
  onSoilMeterChange: () => void
  onSetStatus: (message: string, type: 'info' | 'warning' | 'error') => void
  onShineComplete: () => void
}

// Parse sun prompts (skip comments and empty lines)
const sunPrompts = sunPromptsRaw
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))

// Track recently shown sun prompts to avoid quick repeats
const recentSunPrompts: string[] = []
const RECENT_SUN_PROMPT_LIMIT = Math.min(10, Math.floor(sunPrompts.length / 3))

function getRandomSunPrompt(): string {
  const available = sunPrompts.filter(p => !recentSunPrompts.includes(p))
  const pool = available.length > 0 ? available : sunPrompts

  const prompt = pool[Math.floor(Math.random() * pool.length)]

  recentSunPrompts.push(prompt)
  if (recentSunPrompts.length > RECENT_SUN_PROMPT_LIMIT) {
    recentSunPrompts.shift()
  }

  return prompt
}

// Get all twigs that have data (labels)
function getAllTwigs(): { twigId: string; twigLabel: string }[] {
  const twigs: { twigId: string; twigLabel: string }[] = []

  // Check all branch-X-twig-Y combinations
  for (let b = 0; b < 8; b++) {
    for (let t = 0; t < 8; t++) {
      const twigId = `branch-${b}-twig-${t}`
      const label = getPresetLabel(twigId)
      if (label) {
        twigs.push({ twigId, twigLabel: label })
      }
    }
  }

  return twigs
}

// Get all leaves across all twigs
function getAllLeaves(): { twigId: string; twigLabel: string; leafId: string; leafTitle: string }[] {
  const leaves: { twigId: string; twigLabel: string; leafId: string; leafTitle: string }[] = []

  for (let b = 0; b < 8; b++) {
    for (let t = 0; t < 8; t++) {
      const twigId = `branch-${b}-twig-${t}`
      const twigLabel = getPresetLabel(twigId)
      if (!twigLabel) continue

      const twigLeaves = getTwigLeaves(twigId)
      const twigSprouts = nodeState[twigId]?.sprouts || []

      for (const leaf of twigLeaves) {
        // Get the most recent sprout title as the leaf title
        const leafSprouts = twigSprouts.filter(s => s.leafId === leaf.id)
        const mostRecent = leafSprouts.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]

        if (mostRecent) {
          leaves.push({
            twigId,
            twigLabel,
            leafId: leaf.id,
            leafTitle: mostRecent.title || 'Untitled Leaf'
          })
        }
      }
    }
  }

  return leaves
}

// Randomly select a twig or leaf to reflect on
function selectRandomTarget(): SunEntry['context'] | null {
  const twigs = getAllTwigs()
  const leaves = getAllLeaves()

  // Need at least one twig or leaf to select
  if (twigs.length === 0 && leaves.length === 0) {
    return null
  }

  // 50% chance of selecting a leaf if leaves exist, otherwise always a twig
  const selectLeaf = leaves.length > 0 && Math.random() < 0.5

  if (selectLeaf) {
    const leaf = leaves[Math.floor(Math.random() * leaves.length)]
    return {
      type: 'leaf',
      twigId: leaf.twigId,
      twigLabel: leaf.twigLabel,
      leafId: leaf.leafId,
      leafTitle: leaf.leafTitle
    }
  } else if (twigs.length > 0) {
    const twig = twigs[Math.floor(Math.random() * twigs.length)]
    return {
      type: 'twig',
      twigId: twig.twigId,
      twigLabel: twig.twigLabel
    }
  }

  return null
}

export type ShineApi = {
  updateSunMeter: () => void
  populateSunLogShine: () => void
}

export function initShine(
  ctx: AppContext,
  callbacks: ShineCallbacks
): ShineApi {
  // Current shine context (selected when dialog opens)
  let currentContext: SunEntry['context'] | null = null

  function updateSunMeter() {
    const available = getSunAvailable()
    const canShine = available > 0 && !wasShoneThisWeek()
    ctx.elements.sunCircle.classList.toggle('is-filled', canShine)
  }

  function updateRadiateButtonState() {
    const { sunLogShineJournal, sunLogShineBtn } = ctx.elements
    const hasContent = sunLogShineJournal.value.trim().length > 0
    sunLogShineBtn.disabled = !hasContent
  }

  function populateSunLogShine() {
    const {
      sunLogShineSection,
      sunLogShineTitle,
      sunLogShineMeta,
      sunLogShineJournal,
      sunLogShineBtn,
      sunLogShineShone
    } = ctx.elements

    // Check if already shone this week
    if (wasShoneThisWeek()) {
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      currentContext = null
      return
    }

    // Check if we can afford sun
    if (!canAffordSun()) {
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      currentContext = null
      return
    }

    // Select a random target
    const target = selectRandomTarget()
    if (!target) {
      // No twigs/leaves to shine on
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      currentContext = null
      return
    }

    currentContext = target

    // Display what was selected
    if (target.type === 'leaf') {
      sunLogShineTitle.textContent = target.leafTitle || 'Untitled Leaf'
      sunLogShineMeta.textContent = `on ${target.twigLabel}`
    } else {
      sunLogShineTitle.textContent = target.twigLabel
      sunLogShineMeta.textContent = 'Life Facet'
    }

    sunLogShineJournal.value = ''
    sunLogShineJournal.placeholder = getRandomSunPrompt()
    sunLogShineBtn.disabled = true

    sunLogShineSection.classList.remove('hidden')
    sunLogShineShone.classList.add('hidden')

    // Focus the journal after a brief delay (for dialog animation)
    setTimeout(() => sunLogShineJournal.focus(), 100)
  }

  function saveSunEntry() {
    const { sunLogShineJournal } = ctx.elements
    const entry = sunLogShineJournal.value.trim()

    if (!entry) {
      return
    }

    if (!canAffordSun()) {
      callbacks.onSetStatus('No sun left this week!', 'warning')
      return
    }

    if (currentContext) {
      spendSun()
      updateSunMeter()

      // Recover soil from shining
      const shineContext = currentContext.type === 'leaf'
        ? currentContext.leafTitle || currentContext.twigLabel
        : currentContext.twigLabel
      recoverSoil(getSunRecoveryRate(), 0, 'Shone light', shineContext)
      callbacks.onSoilMeterChange()

      // Save sun entry to global log with context
      const prompt = sunLogShineJournal.placeholder
      addSunEntry(entry, prompt, currentContext)
      callbacks.onSetStatus('Light radiated!', 'info')

      // Refresh the shine section (will show "shone" state) and log
      populateSunLogShine()
      callbacks.onShineComplete()
    }
  }

  // Wire up shine handlers
  ctx.elements.sunLogShineJournal.addEventListener('input', updateRadiateButtonState)
  ctx.elements.sunLogShineBtn.addEventListener('click', saveSunEntry)

  return {
    updateSunMeter,
    populateSunLogShine,
  }
}
