import type { AppContext, SunEntry } from '../types'
import sunPromptsRaw from '../assets/sun-prompts.txt?raw'
import { nodeState, spendSun, canAffordSun, addSunEntry, getSunAvailable, getSunCapacity, wasShoneThisWeek, getPresetLabel, getTwigLeaves } from '../state'

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
function selectRandomTarget(): SunEntry['context'] {
  const twigs = getAllTwigs()
  const leaves = getAllLeaves()

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
  } else {
    const twig = twigs[Math.floor(Math.random() * twigs.length)]
    return {
      type: 'twig',
      twigId: twig.twigId,
      twigLabel: twig.twigLabel
    }
  }
}

export type ShineDialogApi = {
  openShineDialog: () => void
  updateSunMeter: () => void
}

export function initShineDialog(
  ctx: AppContext,
  callbacks: ShineDialogCallbacks
): ShineDialogApi {
  // Shine dialog state
  let currentContext: SunEntry['context'] | null = null

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

  function openShineDialog() {
    // Check if already shone this week
    if (wasShoneThisWeek()) {
      callbacks.onSetStatus('Already shone this week!', 'warning')
      return
    }

    if (!canAffordSun()) {
      callbacks.onSetStatus('No sun left this week!', 'warning')
      return
    }

    // Randomly select a twig or leaf
    const target = selectRandomTarget()
    currentContext = target

    const { shineDialog, shineDialogTitle, shineDialogMeta, shineDialogJournal } = ctx.elements

    // Display what was selected
    if (target.type === 'leaf') {
      shineDialogTitle.textContent = target.leafTitle || 'Untitled Leaf'
      shineDialogMeta.textContent = `on ${target.twigLabel}`
    } else {
      shineDialogTitle.textContent = target.twigLabel
      shineDialogMeta.textContent = 'Life Facet'
    }

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
    currentContext = null
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

    if (currentContext) {
      spendSun()
      updateSunMeter()

      // Save sun entry to global log with context
      const prompt = shineDialogJournal.placeholder
      addSunEntry(entry, prompt, currentContext)
      callbacks.onSetStatus('Light radiated!', 'info')
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
