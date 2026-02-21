/**
 * Tests for features/shine-dialog.ts
 * Tests the sun/shine reflection system: meter updates, dialog state,
 * saveSunEntry logic, and prompt deduplication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AppContext } from '../types'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('../state', () => ({
  canAffordSun: vi.fn(() => true),
  getSunAvailable: vi.fn(() => 1),
  getPresetLabel: vi.fn((id: string) => {
    // Return a label for twigs, branch name for branches
    if (id.includes('twig')) return `Label for ${id}`
    if (id.startsWith('branch-')) return `Branch ${id.replace('branch-', '')}`
    return ''
  }),
  getNextSunReset: vi.fn(() => new Date('2026-02-23T06:00:00Z')),
  formatResetTime: vi.fn(() => 'Monday 6:00 AM'),
}))

vi.mock('../events', () => ({
  appendEvent: vi.fn(),
  getEvents: vi.fn(() => []),
  wasShoneThisWeek: vi.fn(() => false),
}))

vi.mock('../generated/constants', () => ({
  SUN_PROMPTS: {
    generic: [
      'Generic prompt about {twig}?',
      'Another generic about {twig}?',
      'Third generic about {twig}?',
    ],
    specific: {
      'branch-0-twig-0': [
        'Specific prompt for movement about {twig}?',
        'Another specific for {twig}?',
      ],
    },
  },
  RECENT_SHINE_LIMIT: 3,
  GENERIC_WEIGHT: 0.75,
}))

vi.mock('../constants', () => ({
  BRANCH_COUNT: 8,
  TWIG_COUNT: 8,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockElements(): AppContext['elements'] {
  return {
    sunCircle: document.createElement('span'),
    sunLogShineSection: document.createElement('div'),
    sunLogShineTitle: document.createElement('p'),
    sunLogShineMeta: document.createElement('p'),
    sunLogShineJournal: document.createElement('textarea') as HTMLTextAreaElement,
    sunLogShineBtn: document.createElement('button'),
    sunLogShineShone: document.createElement('div'),
    sunLogShineShoneReset: document.createElement('p'),
  } as unknown as AppContext['elements']
}

function createMockCtx(): AppContext {
  return {
    elements: createMockElements(),
    branchGroups: [],
    allNodes: [],
    nodeLookup: new Map(),
  }
}

function createMockCallbacks() {
  return {
    onSunMeterChange: vi.fn(),
    onSoilMeterChange: vi.fn(),
    onShineComplete: vi.fn(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shine-dialog', () => {
  let ctx: AppContext
  let callbacks: ReturnType<typeof createMockCallbacks>
  let canAffordSunMock: ReturnType<typeof vi.fn>
  let getSunAvailableMock: ReturnType<typeof vi.fn>
  let getPresetLabelMock: ReturnType<typeof vi.fn>
  let formatResetTimeMock: ReturnType<typeof vi.fn>
  let appendEventMock: ReturnType<typeof vi.fn>
  let getEventsMock: ReturnType<typeof vi.fn>
  let wasShoneThisWeekMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    vi.clearAllMocks()

    // Re-import mocked modules to get fresh references after resetModules
    const state = await import('../state')
    const events = await import('../events')

    canAffordSunMock = vi.mocked(state.canAffordSun)
    getSunAvailableMock = vi.mocked(state.getSunAvailable)
    getPresetLabelMock = vi.mocked(state.getPresetLabel)
    formatResetTimeMock = vi.mocked(state.formatResetTime)

    appendEventMock = vi.mocked(events.appendEvent)
    getEventsMock = vi.mocked(events.getEvents)
    wasShoneThisWeekMock = vi.mocked(events.wasShoneThisWeek)

    // Reset to defaults
    canAffordSunMock.mockReturnValue(true)
    getSunAvailableMock.mockReturnValue(1)
    getPresetLabelMock.mockImplementation((id: string) => {
      if (id.includes('twig')) return `Label for ${id}`
      if (id.startsWith('branch-')) return `Branch ${id.replace('branch-', '')}`
      return ''
    })
    formatResetTimeMock.mockReturnValue('Monday 6:00 AM')
    appendEventMock.mockImplementation(() => {})
    getEventsMock.mockReturnValue([])
    wasShoneThisWeekMock.mockReturnValue(false)

    ctx = createMockCtx()
    callbacks = createMockCallbacks()

    // Seed Math.random to make selectRandomTwig deterministic
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // updateSunMeter
  // -------------------------------------------------------------------------

  describe('updateSunMeter', () => {
    it('adds is-filled class when sun is available and not yet shone', async () => {
      getSunAvailableMock.mockReturnValue(1)
      wasShoneThisWeekMock.mockReturnValue(false)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.updateSunMeter()

      expect(ctx.elements.sunCircle.classList.contains('is-filled')).toBe(true)
    })

    it('removes is-filled class when already shone this week', async () => {
      getSunAvailableMock.mockReturnValue(1)
      wasShoneThisWeekMock.mockReturnValue(true)

      // Pre-fill the class to verify it gets removed
      ctx.elements.sunCircle.classList.add('is-filled')

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.updateSunMeter()

      expect(ctx.elements.sunCircle.classList.contains('is-filled')).toBe(false)
    })

    it('removes is-filled class when no sun available', async () => {
      getSunAvailableMock.mockReturnValue(0)
      wasShoneThisWeekMock.mockReturnValue(false)

      ctx.elements.sunCircle.classList.add('is-filled')

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.updateSunMeter()

      expect(ctx.elements.sunCircle.classList.contains('is-filled')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // populateSunLogShine - already shone
  // -------------------------------------------------------------------------

  describe('populateSunLogShine - already shone this week', () => {
    it('hides shine section and shows shone state with reset time', async () => {
      wasShoneThisWeekMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      expect(ctx.elements.sunLogShineSection.classList.contains('hidden')).toBe(true)
      expect(ctx.elements.sunLogShineShone.classList.contains('hidden')).toBe(false)
      expect(ctx.elements.sunLogShineShoneReset.textContent).toBe('Monday 6:00 AM')
    })
  })

  // -------------------------------------------------------------------------
  // populateSunLogShine - can't afford sun
  // -------------------------------------------------------------------------

  describe('populateSunLogShine - cannot afford sun', () => {
    it('hides shine section and shows shone state when sun not affordable', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(false)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      expect(ctx.elements.sunLogShineSection.classList.contains('hidden')).toBe(true)
      expect(ctx.elements.sunLogShineShone.classList.contains('hidden')).toBe(false)
      expect(ctx.elements.sunLogShineShoneReset.textContent).toBe('Monday 6:00 AM')
    })
  })

  // -------------------------------------------------------------------------
  // populateSunLogShine - sun available
  // -------------------------------------------------------------------------

  describe('populateSunLogShine - sun available', () => {
    it('shows shine section with random twig, prompt placeholder, and disabled button', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      // Section should be visible, shone should be hidden
      expect(ctx.elements.sunLogShineSection.classList.contains('hidden')).toBe(false)
      expect(ctx.elements.sunLogShineShone.classList.contains('hidden')).toBe(true)

      // Title should show the selected twig label
      expect(ctx.elements.sunLogShineTitle.textContent).toMatch(/Label for branch-\d+-twig-\d+/)

      // Meta should show the branch label
      expect(ctx.elements.sunLogShineMeta.textContent).toMatch(/Branch \d+/)

      // Journal should be cleared with a placeholder prompt
      expect(ctx.elements.sunLogShineJournal.value).toBe('')
      expect(ctx.elements.sunLogShineJournal.placeholder).toBeTruthy()
      expect(ctx.elements.sunLogShineJournal.placeholder.length).toBeGreaterThan(0)

      // Radiate button should be disabled (no content yet)
      expect(ctx.elements.sunLogShineBtn.disabled).toBe(true)
    })

    it('replaces {twig} token in prompt placeholder with twig label', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      // The placeholder should not contain the raw {twig} token
      expect(ctx.elements.sunLogShineJournal.placeholder).not.toContain('{twig}')
      // It should contain the actual twig label (since Math.random is 0, it picks first twig)
      expect(ctx.elements.sunLogShineJournal.placeholder).toContain(
        'Label for branch-0-twig-0',
      )
    })

    it('hides shine section when no twigs have labels', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)
      // Return empty string for all twig labels so getAllTwigs() returns []
      getPresetLabelMock.mockReturnValue('')

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      // Should hide shine section when no twigs are available
      expect(ctx.elements.sunLogShineSection.classList.contains('hidden')).toBe(true)
      expect(ctx.elements.sunLogShineShone.classList.contains('hidden')).toBe(false)
    })

    it('focuses the journal after a brief delay', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const focusSpy = vi.spyOn(ctx.elements.sunLogShineJournal, 'focus')

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      expect(focusSpy).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)

      expect(focusSpy).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------------
  // Radiate button state (input handler)
  // -------------------------------------------------------------------------

  describe('radiate button state', () => {
    it('disables button when journal is empty', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      initShine(ctx, callbacks)

      // Simulate typing then clearing
      ctx.elements.sunLogShineJournal.value = 'some text'
      ctx.elements.sunLogShineJournal.dispatchEvent(new Event('input'))
      expect(ctx.elements.sunLogShineBtn.disabled).toBe(false)

      ctx.elements.sunLogShineJournal.value = ''
      ctx.elements.sunLogShineJournal.dispatchEvent(new Event('input'))
      expect(ctx.elements.sunLogShineBtn.disabled).toBe(true)
    })

    it('enables button when journal has content', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      initShine(ctx, callbacks)

      ctx.elements.sunLogShineJournal.value = 'My reflection'
      ctx.elements.sunLogShineJournal.dispatchEvent(new Event('input'))

      expect(ctx.elements.sunLogShineBtn.disabled).toBe(false)
    })

    it('disables button when journal is only whitespace', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      initShine(ctx, callbacks)

      ctx.elements.sunLogShineJournal.value = '   \n  '
      ctx.elements.sunLogShineJournal.dispatchEvent(new Event('input'))

      expect(ctx.elements.sunLogShineBtn.disabled).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // saveSunEntry (via button click)
  // -------------------------------------------------------------------------

  describe('saveSunEntry', () => {
    it('appends sun_shone event, calls callbacks, and refreshes UI', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)
      vi.setSystemTime(new Date('2026-02-20T12:00:00Z'))

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      // Open the dialog to set currentContext
      api.populateSunLogShine()

      // Type a journal entry
      ctx.elements.sunLogShineJournal.value = 'Deep reflection on movement'
      ctx.elements.sunLogShineJournal.dispatchEvent(new Event('input'))

      // After first save, wasShoneThisWeek returns true (populateSunLogShine is called inside saveSunEntry)
      const savedPlaceholder = ctx.elements.sunLogShineJournal.placeholder
      wasShoneThisWeekMock.mockReturnValue(true)

      // Click the radiate button
      ctx.elements.sunLogShineBtn.click()

      // Should have appended a sun_shone event
      expect(appendEventMock).toHaveBeenCalledTimes(1)
      const event = appendEventMock.mock.calls[0][0]
      expect(event.type).toBe('sun_shone')
      expect(event.content).toBe('Deep reflection on movement')
      expect(event.twigId).toMatch(/^branch-\d+-twig-\d+$/)
      expect(event.twigLabel).toBeTruthy()
      expect(event.prompt).toBe(savedPlaceholder)
      expect(event.timestamp).toBe('2026-02-20T12:00:00.000Z')

      // Callbacks should have been called
      expect(callbacks.onSoilMeterChange).toHaveBeenCalledTimes(1)
      expect(callbacks.onShineComplete).toHaveBeenCalledTimes(1)
    })

    it('does nothing when journal is empty', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      // Leave journal empty and click save
      ctx.elements.sunLogShineJournal.value = ''
      ctx.elements.sunLogShineBtn.click()

      expect(appendEventMock).not.toHaveBeenCalled()
      expect(callbacks.onSoilMeterChange).not.toHaveBeenCalled()
      expect(callbacks.onShineComplete).not.toHaveBeenCalled()
    })

    it('does nothing when journal is only whitespace', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      ctx.elements.sunLogShineJournal.value = '   \t\n  '
      ctx.elements.sunLogShineBtn.click()

      expect(appendEventMock).not.toHaveBeenCalled()
    })

    it('does nothing when cannot afford sun', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      // Open dialog to set currentContext
      api.populateSunLogShine()

      // Type a journal entry
      ctx.elements.sunLogShineJournal.value = 'My reflection'

      // Now set canAffordSun to false (e.g., race condition)
      canAffordSunMock.mockReturnValue(false)

      ctx.elements.sunLogShineBtn.click()

      expect(appendEventMock).not.toHaveBeenCalled()
      expect(callbacks.onSoilMeterChange).not.toHaveBeenCalled()
      expect(callbacks.onShineComplete).not.toHaveBeenCalled()
    })

    it('does nothing when no currentContext is set (dialog not populated)', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      const { initShine } = await import('../features/shine-dialog')
      initShine(ctx, callbacks)

      // Don't call populateSunLogShine, so currentContext is null
      ctx.elements.sunLogShineJournal.value = 'Trying to save without context'
      ctx.elements.sunLogShineBtn.click()

      expect(appendEventMock).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Prompt deduplication
  // -------------------------------------------------------------------------

  describe('prompt deduplication', () => {
    it('avoids recently shown prompts by cycling through available ones', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      // Use a counter to cycle through random values deterministically
      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        // Return 0 most of the time to pick first available item,
        // but vary to test rotation
        return 0
      })

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      const seenPlaceholders = new Set<string>()

      // Call populateSunLogShine multiple times, collecting placeholders.
      // With RECENT_SHINE_LIMIT=3 and 3 generic + 2 specific (for branch-0-twig-0),
      // we should see different prompts each time within the limit.
      for (let i = 0; i < 3; i++) {
        api.populateSunLogShine()
        seenPlaceholders.add(ctx.elements.sunLogShineJournal.placeholder)
      }

      // We should have at least 2 distinct prompts (deduplication forces rotation)
      // With Math.random() = 0 and GENERIC_WEIGHT = 0.75, it always picks generic.
      // But the dedup filter removes recently shown, so each call gets a different one.
      expect(seenPlaceholders.size).toBeGreaterThanOrEqual(2)
    })

    it('clears recent prompts and recycles when all prompts have been shown', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)
      vi.spyOn(Math, 'random').mockReturnValue(0)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      // Call enough times to exhaust all prompts and trigger a reset.
      // With RECENT_SHINE_LIMIT=3, after 3 generic prompts are used,
      // the oldest is evicted from recent. Eventually all get recycled.
      // Call many times to ensure no crash and prompts keep coming.
      for (let i = 0; i < 10; i++) {
        api.populateSunLogShine()
        // Should always produce a non-empty placeholder
        expect(ctx.elements.sunLogShineJournal.placeholder).toBeTruthy()
        expect(ctx.elements.sunLogShineJournal.placeholder.length).toBeGreaterThan(0)
      }
    })
  })

  // -------------------------------------------------------------------------
  // initShine wiring
  // -------------------------------------------------------------------------

  describe('initShine', () => {
    it('returns an object with updateSunMeter and populateSunLogShine functions', async () => {
      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      expect(typeof api.updateSunMeter).toBe('function')
      expect(typeof api.populateSunLogShine).toBe('function')
    })

    it('wires up input listener on journal textarea', async () => {
      const addEventListenerSpy = vi.spyOn(
        ctx.elements.sunLogShineJournal,
        'addEventListener',
      )

      const { initShine } = await import('../features/shine-dialog')
      initShine(ctx, callbacks)

      expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function))
    })

    it('wires up click listener on radiate button', async () => {
      const addEventListenerSpy = vi.spyOn(
        ctx.elements.sunLogShineBtn,
        'addEventListener',
      )

      const { initShine } = await import('../features/shine-dialog')
      initShine(ctx, callbacks)

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })

  // -------------------------------------------------------------------------
  // getRandomPrompt edge cases (tested indirectly via populateSunLogShine)
  // -------------------------------------------------------------------------

  describe('getRandomPrompt edge cases', () => {
    it('falls back to default prompt when all prompt arrays are empty', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      // Override SUN_PROMPTS to have empty arrays
      vi.doMock('../generated/constants', () => ({
        SUN_PROMPTS: {
          generic: [],
          specific: {},
        },
        RECENT_SHINE_LIMIT: 3,
        GENERIC_WEIGHT: 0.75,
      }))

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      expect(ctx.elements.sunLogShineJournal.placeholder).toBe(
        'What are you reflecting on today?',
      )
    })

    it('uses specific prompts when only specific prompts exist for the twig', async () => {
      wasShoneThisWeekMock.mockReturnValue(false)
      canAffordSunMock.mockReturnValue(true)

      // Override SUN_PROMPTS to have no generic, only specific for twig 0-0
      vi.doMock('../generated/constants', () => ({
        SUN_PROMPTS: {
          generic: [],
          specific: {
            'branch-0-twig-0': ['Only specific prompt for {twig}?'],
          },
        },
        RECENT_SHINE_LIMIT: 3,
        GENERIC_WEIGHT: 0.75,
      }))

      // Math.random = 0 selects branch-0-twig-0
      vi.spyOn(Math, 'random').mockReturnValue(0)

      const { initShine } = await import('../features/shine-dialog')
      const api = initShine(ctx, callbacks)

      api.populateSunLogShine()

      expect(ctx.elements.sunLogShineJournal.placeholder).toContain(
        'Only specific prompt for Label for branch-0-twig-0?',
      )
    })
  })
})
