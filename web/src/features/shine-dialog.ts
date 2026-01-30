import type { AppContext, SunEntry } from '../types'
import sunPromptsData from '../assets/sun-prompts.json'
import { spendSun, canAffordSun, addSunEntry, getSunAvailable, wasShoneThisWeek, getPresetLabel, recoverSoil, getSunRecoveryRate, getNextSunReset, formatResetTime } from '../state'

export type ShineCallbacks = {
  onSunMeterChange: () => void
  onSoilMeterChange: () => void
  onSetStatus: (message: string, type: 'info' | 'warning' | 'error') => void
  onShineComplete: () => void
}

// Type for the prompts JSON structure
type SunPrompts = {
  generic: string[]
  specific: Record<string, string[]>
}

const sunPrompts = sunPromptsData as SunPrompts

// Track recently shown prompts globally to avoid quick repeats
const recentPrompts: string[] = []
const RECENT_PROMPT_LIMIT = 15

// Selection weight: 75% generic, 25% specific
const GENERIC_WEIGHT = 0.75

function getRandomPrompt(twigId: string, twigLabel: string): string {
  const genericPrompts = sunPrompts.generic
  const specificPrompts = sunPrompts.specific[twigId] || []

  // Filter out recently shown prompts from each pool
  const availableGeneric = genericPrompts.filter(p => !recentPrompts.includes(p))
  const availableSpecific = specificPrompts.filter(p => !recentPrompts.includes(p))

  // Determine which pool to select from
  let selectedPrompt: string
  const hasGeneric = availableGeneric.length > 0
  const hasSpecific = availableSpecific.length > 0

  if (!hasGeneric && !hasSpecific) {
    // Both pools exhausted, clear recent and try again
    recentPrompts.length = 0
    return getRandomPrompt(twigId, twigLabel)
  }

  if (!hasGeneric) {
    // Only specific available
    selectedPrompt = availableSpecific[Math.floor(Math.random() * availableSpecific.length)]
  } else if (!hasSpecific) {
    // Only generic available
    selectedPrompt = availableGeneric[Math.floor(Math.random() * availableGeneric.length)]
  } else {
    // Both available - use weighted random
    const useGeneric = Math.random() < GENERIC_WEIGHT
    if (useGeneric) {
      selectedPrompt = availableGeneric[Math.floor(Math.random() * availableGeneric.length)]
    } else {
      selectedPrompt = availableSpecific[Math.floor(Math.random() * availableSpecific.length)]
    }
  }

  // Track this prompt as recently shown
  recentPrompts.push(selectedPrompt)
  if (recentPrompts.length > RECENT_PROMPT_LIMIT) {
    recentPrompts.shift()
  }

  // Replace {twig} token with actual label
  return selectedPrompt.replace(/\{twig\}/g, twigLabel)
}

// Get all twigs
function getAllTwigs(): { twigId: string; twigLabel: string }[] {
  const twigs: { twigId: string; twigLabel: string }[] = []

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

// Randomly select a twig to reflect on
function selectRandomTwig(): SunEntry['context'] | null {
  const twigs = getAllTwigs()

  if (twigs.length === 0) {
    return null
  }

  const twig = twigs[Math.floor(Math.random() * twigs.length)]
  return {
    twigId: twig.twigId,
    twigLabel: twig.twigLabel
  }
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
      sunLogShineShone,
      sunLogShineShoneReset
    } = ctx.elements

    // Check if already shone this week
    if (wasShoneThisWeek()) {
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      sunLogShineShoneReset.textContent = formatResetTime(getNextSunReset())
      currentContext = null
      return
    }

    // Check if we can afford sun
    if (!canAffordSun()) {
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      sunLogShineShoneReset.textContent = formatResetTime(getNextSunReset())
      currentContext = null
      return
    }

    // Select a random twig
    const target = selectRandomTwig()
    if (!target) {
      // No twigs to shine on
      sunLogShineSection.classList.add('hidden')
      sunLogShineShone.classList.remove('hidden')
      currentContext = null
      return
    }

    currentContext = target

    // Display what was selected
    sunLogShineTitle.textContent = target.twigLabel
    sunLogShineMeta.textContent = 'Life Facet'

    sunLogShineJournal.value = ''
    sunLogShineJournal.placeholder = getRandomPrompt(target.twigId, target.twigLabel)
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
      recoverSoil(getSunRecoveryRate(), 0, 'Shone light', currentContext.twigLabel)
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
