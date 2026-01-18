import type { AppContext } from '../types'
import sunPromptsRaw from '../assets/sun-prompts.txt?raw'
import { spendSun, canAffordSun, addSunEntry, getSunAvailable, getSunCapacity, wasShoneThisWeek } from '../state'

export type ShineDialogCallbacks = {
  onSunMeterChange: () => void
  onSetStatus: (message: string, type: 'info' | 'warning' | 'error') => void
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

export type ShineDialogApi = {
  openShineDialog: (twig: { twigId: string; twigLabel: string }) => void
  updateSunMeter: () => void
}

export function initShineDialog(
  ctx: AppContext,
  callbacks: ShineDialogCallbacks
): ShineDialogApi {
  // Shine dialog state
  let currentShiningTwig: { twigId: string } | null = null

  function updateSunMeter() {
    const available = getSunAvailable()
    const capacity = getSunCapacity()
    const pct = capacity > 0 ? (available / capacity) * 100 : 0
    ctx.elements.sunMeterFill.style.width = `${pct}%`
    ctx.elements.sunMeterValue.textContent = `${available}/${capacity}`
  }

  function updateRadiateButtonState() {
    const { shineDialogJournal, shineDialogSave } = ctx.elements
    const hasContent = shineDialogJournal.value.trim().length > 0
    shineDialogSave.disabled = !hasContent
  }

  function openShineDialog(twig: { twigId: string; twigLabel: string }) {
    // Check if already shone this week on this twig
    if (wasShoneThisWeek(twig.twigId)) {
      callbacks.onSetStatus('Already reflected on this twig this week!', 'warning')
      return
    }

    if (!canAffordSun()) {
      callbacks.onSetStatus('No sun left this week!', 'warning')
      return
    }

    const { shineDialog, shineDialogTitle, shineDialogMeta, shineDialogJournal } = ctx.elements
    currentShiningTwig = { twigId: twig.twigId }
    shineDialogTitle.textContent = twig.twigLabel || 'Untitled Twig'
    shineDialogMeta.textContent = 'Weekly Reflection'
    shineDialogJournal.value = ''
    shineDialogJournal.placeholder = getRandomSunPrompt()
    updateRadiateButtonState()
    shineDialog.classList.remove('hidden')
    shineDialogJournal.focus()
  }

  function closeShineDialog() {
    const { shineDialog, shineDialogJournal } = ctx.elements
    shineDialog.classList.add('hidden')
    shineDialogJournal.value = ''
    currentShiningTwig = null
  }

  function saveSunEntry() {
    const { shineDialogJournal } = ctx.elements
    const entry = shineDialogJournal.value.trim()

    if (!entry) {
      return
    }

    if (!canAffordSun()) {
      callbacks.onSetStatus('No sun left this week!', 'warning')
      closeShineDialog()
      return
    }

    if (currentShiningTwig) {
      spendSun()
      updateSunMeter()

      // Save sun entry to TWIG data (not sprout)
      const prompt = shineDialogJournal.placeholder
      addSunEntry(currentShiningTwig.twigId, entry, prompt)
      callbacks.onSetStatus('Light radiated on this facet of life!', 'info')
    }

    closeShineDialog()
  }

  // Wire up shine dialog handlers
  ctx.elements.shineDialogClose.addEventListener('click', closeShineDialog)
  ctx.elements.shineDialogCancel.addEventListener('click', closeShineDialog)
  ctx.elements.shineDialogSave.addEventListener('click', saveSunEntry)
  ctx.elements.shineDialogJournal.addEventListener('input', updateRadiateButtonState)
  ctx.elements.shineDialog.addEventListener('click', (e) => {
    if (e.target === ctx.elements.shineDialog) closeShineDialog()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !ctx.elements.shineDialog.classList.contains('hidden')) {
      e.preventDefault()
      closeShineDialog()
    }
  })

  return {
    openShineDialog,
    updateSunMeter,
  }
}
