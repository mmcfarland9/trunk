/**
 * Tests for event store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  initEventStore,
  setEventStoreErrorCallbacks,
  setEventSyncCallback,
  appendEvent,
  appendEvents,
  getEvents,
  getState,
  getWaterAvailable,
  getSunAvailable,
  checkSproutWateredThisWeek,
  getSoilAvailable,
  getSoilCapacity,
  canAffordSoil,
  canAffordWater,
  canAffordSun,
  getWaterCapacity,
  getSunCapacity,
  clearEvents,
  replaceEvents,
  getEventCount,
  exportEvents,
} from '../events/store'
import type { TrunkEvent } from '../events/types'

describe('Event Store', () => {
  beforeEach(() => {
    // Clear events before each test
    clearEvents()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    // Reset callbacks
    setEventSyncCallback(null)
  })

  describe('initEventStore', () => {
    it('loads events from empty localStorage', () => {
      initEventStore()
      expect(getEvents()).toHaveLength(0)
    })

    it('loads events from localStorage with valid data', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sp-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]
      localStorage.setItem('trunk-events-v1', JSON.stringify(events))

      initEventStore()

      expect(getEvents()).toHaveLength(1)
      expect(getEvents()[0].type).toBe('sprout_planted')
    })

    it('handles invalid JSON in localStorage gracefully', () => {
      localStorage.setItem('trunk-events-v1', 'not valid json')

      initEventStore()

      expect(getEvents()).toHaveLength(0)
    })

    it('handles non-array JSON in localStorage gracefully', () => {
      localStorage.setItem('trunk-events-v1', JSON.stringify({ not: 'an array' }))

      initEventStore()

      expect(getEvents()).toHaveLength(0)
    })
  })

  describe('setEventStoreErrorCallbacks', () => {
    it('sets quota error callback', () => {
      const quotaCallback = vi.fn()
      setEventStoreErrorCallbacks(quotaCallback)

      // Callback is stored - we can't directly test without triggering quota error
      expect(quotaCallback).not.toHaveBeenCalled()
    })

    it('sets both callbacks', () => {
      const quotaCallback = vi.fn()
      const errorCallback = vi.fn()
      setEventStoreErrorCallbacks(quotaCallback, errorCallback)

      expect(quotaCallback).not.toHaveBeenCalled()
      expect(errorCallback).not.toHaveBeenCalled()
    })
  })

  describe('setEventSyncCallback', () => {
    it('sets sync callback that fires on appendEvent', () => {
      const syncCallback = vi.fn()
      setEventSyncCallback(syncCallback)

      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }

      appendEvent(event)

      expect(syncCallback).toHaveBeenCalledWith(event)
    })

    it('clears sync callback when set to null', () => {
      const syncCallback = vi.fn()
      setEventSyncCallback(syncCallback)
      setEventSyncCallback(null)

      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }

      appendEvent(event)

      expect(syncCallback).not.toHaveBeenCalled()
    })
  })

  describe('appendEvent', () => {
    it('adds event to the log', () => {
      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }

      appendEvent(event)

      expect(getEvents()).toHaveLength(1)
      expect(getEvents()[0]).toEqual(event)
    })

    it('persists event to localStorage', () => {
      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }

      appendEvent(event)

      const stored = localStorage.getItem('trunk-events-v1')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
    })

    it('invalidates cached state', () => {
      // Populate cache
      getState()

      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }

      appendEvent(event)

      // State should reflect new event
      const state = getState()
      expect(state.sprouts.size).toBe(1)
    })
  })

  describe('appendEvents', () => {
    it('adds multiple events to the log', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sp-1',
          twigId: 'branch-0-twig-0',
          title: 'Test 1',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sp-2',
          twigId: 'branch-0-twig-1',
          title: 'Test 2',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
        },
      ]

      appendEvents(events)

      expect(getEvents()).toHaveLength(2)
    })

    it('fires sync callback for each event', () => {
      const syncCallback = vi.fn()
      setEventSyncCallback(syncCallback)

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sp-1',
          twigId: 'branch-0-twig-0',
          title: 'Test 1',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sp-2',
          twigId: 'branch-0-twig-1',
          title: 'Test 2',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
        },
      ]

      appendEvents(events)

      expect(syncCallback).toHaveBeenCalledTimes(2)
    })
  })

  describe('getState', () => {
    it('returns derived state from events', () => {
      const state = getState()

      expect(state.soilCapacity).toBe(10) // Starting capacity
      expect(state.soilAvailable).toBe(10)
      expect(state.sprouts.size).toBe(0)
    })

    it('caches state on repeated calls', () => {
      const state1 = getState()
      const state2 = getState()

      expect(state1).toBe(state2) // Same object reference
    })
  })

  describe('getWaterAvailable', () => {
    it('returns full water capacity when no watering events', () => {
      const available = getWaterAvailable()

      expect(available).toBe(3) // WATER_DAILY_CAPACITY
    })

    it('decreases after watering event', () => {
      // First plant a sprout
      const plantEvent: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(plantEvent)

      // Then water it
      const waterEvent: TrunkEvent = {
        type: 'sprout_watered',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        content: 'Made progress',
      }
      appendEvent(waterEvent)

      const available = getWaterAvailable()

      expect(available).toBe(2) // 3 - 1
    })
  })

  describe('getSunAvailable', () => {
    it('returns full sun capacity when no sun events', () => {
      const available = getSunAvailable()

      expect(available).toBe(1) // SUN_WEEKLY_CAPACITY
    })
  })

  describe('checkSproutWateredThisWeek', () => {
    it('returns false when sprout was never watered', () => {
      const plantEvent: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(plantEvent)

      expect(checkSproutWateredThisWeek('sp-1')).toBe(false)
    })

    it('returns true when sprout was watered this week', () => {
      const plantEvent: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(plantEvent)

      const waterEvent: TrunkEvent = {
        type: 'sprout_watered',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        content: 'Made progress',
      }
      appendEvent(waterEvent)

      expect(checkSproutWateredThisWeek('sp-1')).toBe(true)
    })
  })

  describe('resource getters', () => {
    it('getSoilAvailable returns starting soil', () => {
      expect(getSoilAvailable()).toBe(10)
    })

    it('getSoilCapacity returns starting capacity', () => {
      expect(getSoilCapacity()).toBe(10)
    })

    it('canAffordSoil returns true when enough soil', () => {
      expect(canAffordSoil(5)).toBe(true)
    })

    it('canAffordSoil returns false when not enough soil', () => {
      expect(canAffordSoil(15)).toBe(false)
    })

    it('canAffordWater returns true when water available', () => {
      expect(canAffordWater()).toBe(true)
    })

    it('canAffordSun returns true when sun available', () => {
      expect(canAffordSun()).toBe(true)
    })

    it('getWaterCapacity returns constant value', () => {
      expect(getWaterCapacity()).toBe(3)
    })

    it('getSunCapacity returns constant value', () => {
      expect(getSunCapacity()).toBe(1)
    })
  })

  describe('clearEvents', () => {
    it('removes all events', () => {
      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(event)

      clearEvents()

      expect(getEvents()).toHaveLength(0)
    })

    it('removes events from localStorage', () => {
      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(event)

      clearEvents()

      expect(localStorage.getItem('trunk-events-v1')).toBeNull()
    })
  })

  describe('replaceEvents', () => {
    it('replaces all events with new array', () => {
      const oldEvent: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-old',
        twigId: 'branch-0-twig-0',
        title: 'Old',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(oldEvent)

      const newEvents: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sp-new',
          twigId: 'branch-0-twig-1',
          title: 'New',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
        },
      ]

      replaceEvents(newEvents)

      expect(getEvents()).toHaveLength(1)
      expect((getEvents()[0] as any).sproutId).toBe('sp-new')
    })

    it('persists replaced events to localStorage', () => {
      const newEvents: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: new Date().toISOString(),
          sproutId: 'sp-new',
          twigId: 'branch-0-twig-1',
          title: 'New',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
        },
      ]

      replaceEvents(newEvents)

      const stored = localStorage.getItem('trunk-events-v1')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed[0].sproutId).toBe('sp-new')
    })
  })

  describe('getEventCount', () => {
    it('returns 0 when no events', () => {
      expect(getEventCount()).toBe(0)
    })

    it('returns correct count after adding events', () => {
      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(event)
      appendEvent({ ...event, sproutId: 'sp-2' })

      expect(getEventCount()).toBe(2)
    })
  })

  describe('exportEvents', () => {
    it('returns empty array when no events', () => {
      expect(exportEvents()).toEqual([])
    })

    it('returns copy of events array', () => {
      const event: TrunkEvent = {
        type: 'sprout_planted',
        timestamp: new Date().toISOString(),
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      appendEvent(event)

      const exported = exportEvents()

      expect(exported).toHaveLength(1)
      expect(exported).not.toBe(getEvents()) // Different array reference
    })
  })
})
