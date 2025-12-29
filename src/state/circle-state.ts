import type { CircleData } from '../types'
import { STORAGE_KEY } from '../constants'

type CircleDataPayload = {
  label?: unknown
  note?: unknown
  detail?: unknown
}

function normalizeCircleData(value: unknown): CircleData | null {
  if (!value || typeof value !== 'object') return null

  const payload = value as CircleDataPayload
  const label = typeof payload.label === 'string' ? payload.label : ''
  const noteValue = typeof payload.note === 'string' ? payload.note : ''
  const legacyDetail = typeof payload.detail === 'string' ? payload.detail : ''
  const note = noteValue || legacyDetail

  if (!label && !note) return null

  return { label, note }
}

function loadState(): Record<string, CircleData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const nextState: Record<string, CircleData> = {}
      Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
        const normalized = normalizeCircleData(value)
        if (normalized) {
          nextState[key] = normalized
        }
      })
      return nextState
    }
  } catch (error) {
    console.warn('Could not read saved notes', error)
  }
  return {}
}

export const circleState: Record<string, CircleData> = loadState()

export let lastSavedAt: Date | null = null

export function saveState(onSaved?: () => void): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(circleState))
    lastSavedAt = new Date()
    onSaved?.()
  } catch (error) {
    console.warn('Could not save notes', error)
  }
}

export function clearState(): void {
  Object.keys(circleState).forEach((key) => delete circleState[key])
  lastSavedAt = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Could not clear saved notes', error)
  }
}

export function getCircleData(circleId: string): CircleData | undefined {
  return circleState[circleId]
}

export function setCircleData(circleId: string, data: CircleData): void {
  circleState[circleId] = data
}

export function deleteCircleData(circleId: string): void {
  delete circleState[circleId]
}

export function hasCircleData(): boolean {
  return Object.keys(circleState).length > 0
}
