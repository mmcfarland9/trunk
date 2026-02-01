/**
 * STATE - Node State Management
 *
 * This file contains legacy state management that is being migrated to event sourcing
 * in Phase 4 of the Elegance Refactor.
 *
 * === COMPLETED MIGRATIONS (Tasks 4.1-4.2) ===
 *
 * Sprout operations now emit events in addition to updating legacy state:
 * - sprout_planted: emitted in twig-view.ts when planting
 * - sprout_watered: emitted in water-dialog.ts when watering
 * - sprout_harvested: emitted in harvest-dialog.ts when harvesting
 * - sprout_uprooted: emitted in twig-view.ts when uprooting
 *
 * Leaf operations now emit events:
 * - leaf_created: emitted in createLeaf() when creating new leaf
 *
 * Legacy nodeState is still updated for backward compatibility.
 * Events are the source of truth; nodeState can be derived from events.
 *
 * === COMPLETED MIGRATION (Task 4.3) ===
 *
 * Sun operations now emit events:
 * - sun_shone: emitted in addSunEntry() when shining
 *
 * === REMAINING MIGRATIONS (Task 4.4) ===
 *
 * Line ~370: soilLog.push({...})
 *   - Function: addSoilEntry()
 *   - Fix: Events already capture soil changes; remove soilLog
 *
 * Line ~390: delete nodeState[nodeId]
 *   - Function: deleteNodeData()
 *   - Fix: Not needed for event-sourced state
 *
 * === ACCEPTABLE MUTATIONS (Debug/Migration/Local) ===
 *
 * Line ~90: delete leaf.status
 *   - Context: Schema migration v1->v2 (one-time data transform)
 *
 * Line ~135: entries.push({...})
 *   - Context: Building local return array in getAllWaterEntries()
 *
 * Lines ~250, ~255: sunLog.length = 0, soilLog.length = 0
 *   - Context: Called from resetResources() debug function
 *
 * Line ~380: delete nodeState[key]
 *   - Context: clearState() debug function
 *
 * See: docs/ARCHITECTURE.md for event sourcing design
 * See: events/store.ts for event infrastructure
 */

import type { NodeData, Sprout, SproutState, SunEntry, SoilEntry, Leaf, NotificationSettings, WaterLogEntry } from '../types'
import { STORAGE_KEY } from '../constants'
import presetData from '../../../shared/assets/trunk-map-preset.json'
import { STORAGE_KEYS } from '../generated/constants'
import { safeSetItem, type StorageResult } from '../utils/safe-storage'
import { CURRENT_SCHEMA_VERSION, runMigrations } from './migrations'
import {
  getDebugDate,
  getTodayResetTime,
  getWeekResetTime,
  getWeekString,
  setAddSoilEntryCallback,
  setGetWaterUsedTodayCallback,
  setGetSunUsedThisWeekCallback,
  setResetCallbacks,
  setResourceQuotaErrorCallback,
} from './resources'
import { appendEvent } from '../events'

// --- Node Data Normalization ---

function normalizeNodeData(value: unknown): NodeData | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as {
    label?: unknown
    note?: unknown
    detail?: unknown
    goal?: unknown
    goalType?: unknown
    goalValue?: unknown
    goalTitle?: unknown
    sprouts?: unknown
    leaves?: unknown
  }
  const label = typeof payload.label === 'string' ? payload.label : ''
  const noteValue = typeof payload.note === 'string' ? payload.note : ''
  const legacyDetail = typeof payload.detail === 'string' ? payload.detail : ''
  const note = noteValue || legacyDetail

  // Check for existing sprouts array
  let sprouts: Sprout[] | undefined
  if (Array.isArray(payload.sprouts)) {
    sprouts = payload.sprouts.filter((s): s is Sprout =>
      s && typeof s === 'object' &&
      typeof s.id === 'string' &&
      typeof s.title === 'string'
    )
    if (sprouts.length === 0) sprouts = undefined
  }

  // Check for existing leaves array
  let leaves: Leaf[] | undefined
  if (Array.isArray(payload.leaves)) {
    leaves = payload.leaves.filter((l): l is Leaf =>
      l && typeof l === 'object' &&
      typeof l.id === 'string'
    )
    if (leaves.length === 0) leaves = undefined
  }

  // Migrate legacy goal fields to sprouts (only if no sprouts exist)
  if (!sprouts) {
    const legacyGoal = payload.goal === 'true'
    const hasLegacyGoal = payload.goalType || payload.goalValue || payload.goalTitle || legacyGoal
    if (hasLegacyGoal) {
      const goalValue = typeof payload.goalValue === 'number' ? payload.goalValue : (legacyGoal ? 100 : 0)
      const goalTitle = typeof payload.goalTitle === 'string' ? payload.goalTitle : ''

      // Only migrate if there's actual goal data
      if (goalValue > 0 || goalTitle) {
        sprouts = [{
          id: generateSproutId(),
          title: goalTitle || 'Migrated goal',
          season: '1m', // Default season for migrated goals
          environment: 'fertile', // Default environment for migrated goals
          state: goalValue === 100 ? 'completed' : 'active',
          soilCost: 3, // Default cost for 1m greenhouse
          createdAt: new Date().toISOString(),
          activatedAt: new Date().toISOString(),
          result: goalValue === 100 ? 5 : undefined, // Map 100% completion to 5/5
        }]
      }
    }
  }

  if (!label && !note && !sprouts && !leaves) return null
  return { label, note, sprouts, leaves }
}

// --- Preset Labels ---

const presetLabels: Record<string, { label: string; note: string }> = {}
const circles = (presetData as { circles?: Record<string, { label?: string; note?: string }> }).circles
if (circles) {
  Object.entries(circles).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      const label = typeof value.label === 'string' ? value.label : ''
      const note = typeof value.note === 'string' ? value.note : ''
      presetLabels[key] = { label, note }
    }
  })
}

export function getPresetLabel(nodeId: string): string {
  return presetLabels[nodeId]?.label || ''
}

export function getPresetNote(nodeId: string): string {
  return presetLabels[nodeId]?.note || ''
}

function loadPreset(): Record<string, NodeData> {
  const preset: Record<string, NodeData> = {}
  Object.entries(presetLabels).forEach(([key, value]) => {
    if (value.label || value.note) {
      preset[key] = { label: value.label, note: value.note }
    }
  })
  return preset
}

// --- State Loading ---

function loadState(): Record<string, NodeData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return loadPreset()
    }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const migrated = runMigrations(parsed as Record<string, unknown>)

      const nextState: Record<string, NodeData> = {}
      Object.entries(migrated.nodes).forEach(([key, value]) => {
        const normalized = normalizeNodeData(value)
        if (normalized) {
          const nodeKey = key === 'center' ? 'trunk' : key
          nextState[nodeKey] = normalized
        }
      })

      if (Object.keys(nextState).length === 0) {
        return loadPreset()
      }

      if (!parsed._version || parsed._version < CURRENT_SCHEMA_VERSION) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          _version: CURRENT_SCHEMA_VERSION,
          nodes: nextState,
        }))
      }

      return nextState
    }
  } catch (error) {
    console.warn('Could not read saved notes', error)
  }
  return loadPreset()
}

export const nodeState: Record<string, NodeData> = loadState()
export let lastSavedAt: Date | null = null

// --- Sun Log ---

function loadSunLog(): SunEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.sunLog && Array.isArray(parsed.sunLog)) {
        return parsed.sunLog
      }
    }
  } catch (error) {
    console.warn('Could not load sun log', error)
  }
  return []
}

export const sunLog: SunEntry[] = loadSunLog()

// --- Soil Log ---

function loadSoilLog(): SoilEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.soilLog && Array.isArray(parsed.soilLog)) {
        return parsed.soilLog
      }
    }
  } catch (error) {
    console.warn('Could not load soil log', error)
  }
  return []
}

export const soilLog: SoilEntry[] = loadSoilLog()

// --- Storage Error Callbacks ---

let onQuotaError: (() => void) | null = null
let onSaveError: ((error: unknown) => void) | null = null

let pendingSave = false
let saveRetryTimeout: number | null = null
const SAVE_RETRY_DELAY = 5000

function scheduleSaveRetry(): void {
  if (saveRetryTimeout) return
  pendingSave = true
  saveRetryTimeout = window.setTimeout(() => {
    saveRetryTimeout = null
    if (pendingSave) {
      pendingSave = false
      saveState()
    }
  }, SAVE_RETRY_DELAY)
}

export function setStorageErrorCallbacks(
  quotaCallback: () => void,
  errorCallback?: (error: unknown) => void
): void {
  onQuotaError = quotaCallback
  onSaveError = errorCallback ?? null
  // Also set the callback for resources.ts
  setResourceQuotaErrorCallback(quotaCallback)
}

// --- State Saving ---

export function saveState(onSaved?: () => void): StorageResult {
  const data = JSON.stringify({
    _version: CURRENT_SCHEMA_VERSION,
    nodes: nodeState,
    sunLog,
    soilLog,
  })

  const result = safeSetItem(STORAGE_KEY, data)

  if (result.success) {
    lastSavedAt = new Date()
    pendingSave = false
    onSaved?.()
  } else if (result.isQuotaError) {
    console.warn('localStorage quota exceeded')
    onQuotaError?.()
  } else {
    console.warn('Could not save notes - will retry')
    onSaveError?.(new Error('Storage unavailable'))
    scheduleSaveRetry()
  }

  return result
}

export function clearState(): void {
  Object.keys(nodeState).forEach((key) => delete nodeState[key])
  lastSavedAt = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Could not clear saved notes', error)
  }
}

export function deleteNodeData(nodeId: string): void {
  delete nodeState[nodeId]
}

export function hasNodeData(): boolean {
  return Object.keys(nodeState).length > 0
}

// --- Sprout Helpers ---

export function generateSproutId(): string {
  return `sprout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getSproutsByState(sprouts: Sprout[], state: SproutState): Sprout[] {
  return sprouts.filter(s => s.state === state)
}

export function getActiveSprouts(sprouts: Sprout[]): Sprout[] {
  return getSproutsByState(sprouts, 'active')
}

export function getHistorySprouts(sprouts: Sprout[]): Sprout[] {
  return sprouts.filter(s => s.state === 'completed')
}

// --- Leaf Helpers ---

export function generateLeafId(): string {
  return `leaf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getTwigLeaves(twigId: string): Leaf[] {
  return nodeState[twigId]?.leaves || []
}

export function getLeafById(twigId: string, leafId: string): Leaf | undefined {
  return getTwigLeaves(twigId).find(l => l.id === leafId)
}

export function getSproutsByLeaf(sprouts: Sprout[], leafId: string): Sprout[] {
  return sprouts.filter(s => s.leafId === leafId)
}

export function createLeaf(twigId: string, name: string): Leaf {
  if (!nodeState[twigId]) {
    nodeState[twigId] = { label: '', note: '' }
  }
  if (!nodeState[twigId].leaves) {
    nodeState[twigId].leaves = []
  }

  const timestamp = getDebugDate().toISOString()
  const leaf: Leaf = {
    id: generateLeafId(),
    name,
    createdAt: timestamp,
  }

  // Emit event (source of truth)
  appendEvent({
    type: 'leaf_created',
    timestamp,
    leafId: leaf.id,
    twigId,
    name: leaf.name,
  })

  // Update legacy state for backward compatibility
  nodeState[twigId].leaves.push(leaf)
  saveState()
  return leaf
}

// --- Water Entry Helpers ---

// Cache for water count to avoid O(n*m*k) iteration on every call
let waterCountCache: { resetTime: number; count: number } | null = null
let waterEntriesCache: WaterLogEntry[] | null = null

function invalidateWaterCountCache(): void {
  waterCountCache = null
  waterEntriesCache = null
}

function getWaterUsedToday(): number {
  const resetTime = getTodayResetTime()
  const resetMs = resetTime.getTime()

  if (waterCountCache && waterCountCache.resetTime === resetMs) {
    return waterCountCache.count
  }

  let count = 0
  for (const data of Object.values(nodeState)) {
    for (const sprout of data.sprouts ?? []) {
      for (const entry of sprout.waterEntries ?? []) {
        if (new Date(entry.timestamp) >= resetTime) {
          count++
        }
      }
    }
  }

  waterCountCache = { resetTime: resetMs, count }
  return count
}

// Register the callback with resources.ts
setGetWaterUsedTodayCallback(getWaterUsedToday)

export function getAllWaterEntries(): WaterLogEntry[] {
  if (waterEntriesCache) {
    return waterEntriesCache
  }

  const entries: WaterLogEntry[] = []

  for (const [nodeId, data] of Object.entries(nodeState)) {
    if (!nodeId.includes('twig') || !data.sprouts) continue
    const twigLabel = data.label || nodeId

    for (const sprout of data.sprouts) {
      if (!sprout.waterEntries) continue
      for (const entry of sprout.waterEntries) {
        entries.push({
          timestamp: entry.timestamp,
          content: entry.content,
          prompt: entry.prompt,
          sproutTitle: sprout.title,
          twigLabel,
        })
      }
    }
  }

  waterEntriesCache = entries.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  return waterEntriesCache
}

export function addWaterEntry(
  twigId: string,
  sproutId: string,
  content: string,
  prompt?: string
): boolean {
  const data = nodeState[twigId]
  if (!data?.sprouts) return false

  const sprout = data.sprouts.find(s => s.id === sproutId)
  if (!sprout) return false

  if (!sprout.waterEntries) {
    sprout.waterEntries = []
  }

  sprout.waterEntries.push({
    timestamp: new Date().toISOString(),
    content,
    prompt,
  })

  invalidateWaterCountCache()
  saveState()
  return true
}

export function wasWateredThisWeek(sprout: Sprout): boolean {
  if (!sprout.waterEntries?.length) return false
  const resetTime = getWeekResetTime()
  return sprout.waterEntries.some(entry => new Date(entry.timestamp) >= resetTime)
}

// --- Sun Entry Helpers ---

function getSunUsedThisWeek(): number {
  const resetTime = getWeekResetTime()
  return sunLog.filter(entry => new Date(entry.timestamp) >= resetTime).length
}

// Register the callback with resources.ts
setGetSunUsedThisWeekCallback(getSunUsedThisWeek)

export function addSunEntry(
  content: string,
  prompt: string | undefined,
  context: SunEntry['context']
): void {
  const timestamp = getDebugDate().toISOString()

  // Emit event (source of truth)
  appendEvent({
    type: 'sun_shone',
    timestamp,
    twigId: context.twigId,
    twigLabel: context.twigLabel,
    content,
    prompt,
  })

  // Update legacy state for backward compatibility
  sunLog.push({
    timestamp,
    content,
    prompt,
    context,
  })
  saveState()
}

export function wasShoneThisWeek(): boolean {
  if (!sunLog.length) return false

  const thisWeek = getWeekString(getDebugDate())
  return sunLog.some(entry => {
    const entryWeek = getWeekString(new Date(entry.timestamp))
    return entryWeek === thisWeek
  })
}

// --- Soil Entry Helpers ---

export function addSoilEntry(amount: number, reason: string, context?: string): void {
  soilLog.push({
    timestamp: getDebugDate().toISOString(),
    amount,
    reason,
    context,
  })
  // Don't call saveState here - it will be called by the caller
}

// Register the callback with resources.ts
setAddSoilEntryCallback(addSoilEntry)

// --- Reset Callbacks ---

function clearWaterEntries(): void {
  for (const data of Object.values(nodeState)) {
    if (data.sprouts) {
      for (const sprout of data.sprouts) {
        sprout.waterEntries = []
      }
    }
  }
  invalidateWaterCountCache()
}

function clearSunLog(): void {
  sunLog.length = 0
}

function clearSoilLog(): void {
  soilLog.length = 0
}

// Register reset callbacks with resources.ts
setResetCallbacks({
  clearWaterEntries,
  clearSunLog,
  clearSoilLog,
  saveState,
})

// --- Notification Settings ---

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.settings

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  name: '',
  email: '',
  checkInFrequency: 'off',
  preferredTime: 'morning',
  events: {
    harvestReady: true,
    shineAvailable: true,
  },
}

function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...parsed,
        events: {
          ...DEFAULT_NOTIFICATION_SETTINGS.events,
          ...parsed?.events,
        },
      }
    }
  } catch (error) {
    console.warn('Could not load notification settings', error)
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS }
}

let notificationSettings: NotificationSettings = loadNotificationSettings()

export function getNotificationSettings(): NotificationSettings {
  return notificationSettings
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  notificationSettings = settings
  const result = safeSetItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  if (!result.success && result.isQuotaError) {
    console.warn('localStorage quota exceeded while saving settings')
    onQuotaError?.()
  }
}
