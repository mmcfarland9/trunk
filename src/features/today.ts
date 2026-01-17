import type { AppContext, Sprout } from '../types'
import { nodeState, getDebugDate, getDebugNow } from '../state'

function isReady(sprout: Sprout): boolean {
  if (!sprout.endDate) return true
  return new Date(sprout.endDate).getTime() <= getDebugNow()
}

function wasWateredToday(sprout: Sprout): boolean {
  if (!sprout.waterEntries?.length) return false
  const today = getDebugDate().toISOString().split('T')[0]
  return sprout.waterEntries.some(entry => entry.timestamp.split('T')[0] === today)
}

export type TodayStats = {
  readyCount: number
  needWaterCount: number
  totalActive: number
}

export function getTodayStats(): TodayStats {
  let readyCount = 0
  let needWaterCount = 0
  let totalActive = 0

  Object.values(nodeState).forEach(data => {
    if (!data.sprouts) return
    data.sprouts.forEach(sprout => {
      if (sprout.state !== 'active') return
      totalActive++

      if (isReady(sprout)) {
        readyCount++
      } else if (!wasWateredToday(sprout)) {
        needWaterCount++
      }
    })
  })

  return { readyCount, needWaterCount, totalActive }
}

export function updateTodayIndicator(ctx: AppContext): void {
  const indicator = ctx.elements.shell.querySelector<HTMLElement>('.today-indicator')
  if (!indicator) return

  const stats = getTodayStats()

  if (stats.totalActive === 0) {
    indicator.classList.add('hidden')
    return
  }

  indicator.classList.remove('hidden')

  const parts: string[] = []
  if (stats.readyCount > 0) {
    parts.push(`${stats.readyCount} ready`)
  }
  if (stats.needWaterCount > 0) {
    parts.push(`${stats.needWaterCount} to water`)
  }

  if (parts.length === 0) {
    indicator.textContent = 'All tended'
    indicator.dataset.tone = 'success'
  } else {
    indicator.textContent = parts.join(' · ')
    indicator.dataset.tone = stats.readyCount > 0 ? 'ready' : 'water'
  }
}
