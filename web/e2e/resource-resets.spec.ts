/**
 * E2E tests for resource time resets.
 * Verifies daily water reset (6 AM) and weekly sun reset (Monday 6 AM)
 * using Playwright's clock API for deterministic time control.
 */

import { test, expect, resetAppState } from './fixtures'

/** Navigate from overview to branch-0 twig-0 */
async function navigateToTwig(page: import('@playwright/test').Page): Promise<void> {
  await page.click('.node.branch', { force: true })
  await page.waitForFunction(() =>
    document.querySelector('.canvas')?.classList.contains('is-zoomed')
  )
  await page.evaluate(() => {
    const twig = document.querySelector('.branch-group.is-active .node.twig') as HTMLElement
    twig?.click()
  })
  await page.waitForSelector('.twig-view:not(.hidden)')
}

/** Read all events from localStorage */
async function getStoredEvents(page: import('@playwright/test').Page): Promise<any[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('trunk-events-v1')
    return raw ? JSON.parse(raw) : []
  })
}

test.describe('Resource Time Resets', () => {

  test('water resets to full at 6 AM', async ({ page }) => {
    // Install clock just before the daily 6 AM reset
    // At 5:59 AM on Feb 15, getTodayResetTime() returns Feb 14 6 AM
    // Water events from Feb 14 evening count as "today's" water
    await page.clock.install({ time: new Date(2026, 1, 15, 5, 59, 0) })
    await page.goto('/')

    // Seed: 3 sprouts planted a week ago, each watered yesterday evening
    const plantTs = new Date(2026, 1, 8, 12, 0, 0).toISOString()
    const wt1 = new Date(2026, 1, 14, 22, 0, 0).toISOString()
    const wt2 = new Date(2026, 1, 14, 22, 1, 0).toISOString()
    const wt3 = new Date(2026, 1, 14, 22, 2, 0).toISOString()

    await page.evaluate(({ plantTs, wt1, wt2, wt3 }) => {
      const authKeys: [string, string][] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!
        if (key.startsWith('sb-')) authKeys.push([key, localStorage.getItem(key)!])
      }
      localStorage.clear()
      for (const [k, v] of authKeys) localStorage.setItem(k, v)
      localStorage.setItem('trunk-events-v1', JSON.stringify([
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l1', twigId: 'branch-0-twig-0', name: 'Saga 1' },
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l2', twigId: 'branch-0-twig-0', name: 'Saga 2' },
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l3', twigId: 'branch-0-twig-0', name: 'Saga 3' },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's1', twigId: 'branch-0-twig-0', leafId: 'l1', title: 'Sprout A', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's2', twigId: 'branch-0-twig-0', leafId: 'l2', title: 'Sprout B', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's3', twigId: 'branch-0-twig-0', leafId: 'l3', title: 'Sprout C', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_watered', timestamp: wt1, sproutId: 's1', content: 'entry 1' },
        { type: 'sprout_watered', timestamp: wt2, sproutId: 's2', content: 'entry 2' },
        { type: 'sprout_watered', timestamp: wt3, sproutId: 's3', content: 'entry 3' },
      ]))
    }, { plantTs, wt1, wt2, wt3 })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Water should be depleted (0/3 filled)
    expect(await page.locator('.water-circle.is-filled').count()).toBe(0)

    // Advance past the 6 AM daily reset boundary
    // At 6:01 AM on Feb 15, getTodayResetTime() returns Feb 15 6 AM
    // The Feb 14 evening events are now before the reset window
    await page.clock.setFixedTime(new Date(2026, 1, 15, 6, 1, 0))
    await page.reload()
    await page.waitForSelector('.canvas')

    // Water should now be full (3/3 filled)
    expect(await page.locator('.water-circle.is-filled').count()).toBe(3)

    // DATA INTEGRITY: all 3 water events still in localStorage
    const events = await getStoredEvents(page)
    expect(events.filter((e: any) => e.type === 'sprout_watered')).toHaveLength(3)
  })

  test('water does not reset before 6 AM', async ({ page }) => {
    // Install clock at 11 PM Saturday evening
    await page.clock.install({ time: new Date(2026, 1, 14, 23, 0, 0) })
    await page.goto('/')

    // Seed: 3 sprouts watered earlier this evening (all after today's 6 AM reset)
    const plantTs = new Date(2026, 1, 8, 12, 0, 0).toISOString()
    const wt1 = new Date(2026, 1, 14, 20, 0, 0).toISOString()
    const wt2 = new Date(2026, 1, 14, 20, 1, 0).toISOString()
    const wt3 = new Date(2026, 1, 14, 20, 2, 0).toISOString()

    await page.evaluate(({ plantTs, wt1, wt2, wt3 }) => {
      const authKeys: [string, string][] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!
        if (key.startsWith('sb-')) authKeys.push([key, localStorage.getItem(key)!])
      }
      localStorage.clear()
      for (const [k, v] of authKeys) localStorage.setItem(k, v)
      localStorage.setItem('trunk-events-v1', JSON.stringify([
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l1', twigId: 'branch-0-twig-0', name: 'Saga 1' },
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l2', twigId: 'branch-0-twig-0', name: 'Saga 2' },
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l3', twigId: 'branch-0-twig-0', name: 'Saga 3' },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's1', twigId: 'branch-0-twig-0', leafId: 'l1', title: 'Sprout A', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's2', twigId: 'branch-0-twig-0', leafId: 'l2', title: 'Sprout B', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's3', twigId: 'branch-0-twig-0', leafId: 'l3', title: 'Sprout C', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_watered', timestamp: wt1, sproutId: 's1', content: 'entry 1' },
        { type: 'sprout_watered', timestamp: wt2, sproutId: 's2', content: 'entry 2' },
        { type: 'sprout_watered', timestamp: wt3, sproutId: 's3', content: 'entry 3' },
      ]))
    }, { plantTs, wt1, wt2, wt3 })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Water should be depleted
    expect(await page.locator('.water-circle.is-filled').count()).toBe(0)

    // Advance to 3 AM (still before the 6 AM reset boundary)
    // getTodayResetTime(3 AM Feb 15) still returns Feb 14 6 AM
    await page.clock.setFixedTime(new Date(2026, 1, 15, 3, 0, 0))
    await page.reload()
    await page.waitForSelector('.canvas')

    // Water should STILL be depleted (reset hasn't happened)
    expect(await page.locator('.water-circle.is-filled').count()).toBe(0)

    // DATA INTEGRITY: water events preserved
    const events = await getStoredEvents(page)
    expect(events.filter((e: any) => e.type === 'sprout_watered')).toHaveLength(3)
  })

  test('sun resets on Monday at 6 AM', async ({ page }) => {
    // Feb 15, 2026 is a Sunday. Install clock at Sunday afternoon.
    // getWeekResetTime(Sun Feb 15) returns Monday Feb 9 6 AM
    await page.clock.install({ time: new Date(2026, 1, 15, 14, 0, 0) })
    await page.goto('/')

    // Seed: sun used earlier today (Sunday, after this week's Monday reset)
    const sunTs = new Date(2026, 1, 15, 10, 0, 0).toISOString()

    await page.evaluate(({ sunTs }) => {
      const authKeys: [string, string][] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!
        if (key.startsWith('sb-')) authKeys.push([key, localStorage.getItem(key)!])
      }
      localStorage.clear()
      for (const [k, v] of authKeys) localStorage.setItem(k, v)
      localStorage.setItem('trunk-events-v1', JSON.stringify([
        { type: 'sun_shone', timestamp: sunTs, twigId: 'branch-0-twig-0', twigLabel: 'movement', content: 'Sunday reflection' },
      ]))
    }, { sunTs })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Sun should be depleted (0/1)
    expect(await page.locator('.sun-circle.is-filled').count()).toBe(0)

    // Advance to Monday Feb 16 at 6:01 AM (weekly reset boundary)
    // getWeekResetTime(Mon Feb 16 6:01 AM) returns Mon Feb 16 6 AM
    // Sunday's sun event is before that → no longer counted
    await page.clock.setFixedTime(new Date(2026, 1, 16, 6, 1, 0))
    await page.reload()
    await page.waitForSelector('.canvas')

    // Sun should be full (1/1)
    expect(await page.locator('.sun-circle.is-filled').count()).toBe(1)

    // DATA INTEGRITY: sun event still in localStorage
    const events = await getStoredEvents(page)
    expect(events.filter((e: any) => e.type === 'sun_shone')).toHaveLength(1)
  })

  test('sun does not reset mid-week', async ({ page }) => {
    // Wednesday Feb 18, 2026 afternoon
    // getWeekResetTime(Wed Feb 18) returns Mon Feb 16 6 AM
    await page.clock.install({ time: new Date(2026, 1, 18, 14, 0, 0) })
    await page.goto('/')

    // Seed: sun used Wednesday morning (after Monday's reset)
    const sunTs = new Date(2026, 1, 18, 10, 0, 0).toISOString()

    await page.evaluate(({ sunTs }) => {
      const authKeys: [string, string][] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!
        if (key.startsWith('sb-')) authKeys.push([key, localStorage.getItem(key)!])
      }
      localStorage.clear()
      for (const [k, v] of authKeys) localStorage.setItem(k, v)
      localStorage.setItem('trunk-events-v1', JSON.stringify([
        { type: 'sun_shone', timestamp: sunTs, twigId: 'branch-0-twig-0', twigLabel: 'movement', content: 'Wednesday reflection' },
      ]))
    }, { sunTs })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Sun should be depleted
    expect(await page.locator('.sun-circle.is-filled').count()).toBe(0)

    // Advance to Thursday (same week, next reset isn't until Monday)
    // getWeekResetTime(Thu Feb 19) still returns Mon Feb 16 6 AM
    await page.clock.setFixedTime(new Date(2026, 1, 19, 12, 0, 0))
    await page.reload()
    await page.waitForSelector('.canvas')

    // Sun should STILL be depleted
    expect(await page.locator('.sun-circle.is-filled').count()).toBe(0)

    // DATA INTEGRITY: sun event preserved
    const events = await getStoredEvents(page)
    expect(events.filter((e: any) => e.type === 'sun_shone')).toHaveLength(1)
  })

  test('water meter displays correct remaining count after partial use', async ({ page }) => {
    // Stable noon time (well past 6 AM reset)
    await page.clock.install({ time: new Date(2026, 1, 15, 12, 0, 0) })
    await page.goto('/')

    // Seed: 1 sprout watered once today → 1 of 3 waters used
    const plantTs = new Date(2026, 1, 8, 12, 0, 0).toISOString()
    const waterTs = new Date(2026, 1, 15, 10, 0, 0).toISOString()

    await page.evaluate(({ plantTs, waterTs }) => {
      const authKeys: [string, string][] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!
        if (key.startsWith('sb-')) authKeys.push([key, localStorage.getItem(key)!])
      }
      localStorage.clear()
      for (const [k, v] of authKeys) localStorage.setItem(k, v)
      localStorage.setItem('trunk-events-v1', JSON.stringify([
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l1', twigId: 'branch-0-twig-0', name: 'Saga' },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's1', twigId: 'branch-0-twig-0', leafId: 'l1', title: 'Test Sprout', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_watered', timestamp: waterTs, sproutId: 's1', content: 'morning water' },
      ]))
    }, { plantTs, waterTs })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Should show 2 filled circles (3 capacity - 1 used = 2 remaining)
    expect(await page.locator('.water-circle.is-filled').count()).toBe(2)

    // DATA INTEGRITY: exactly 1 water event in storage
    const events = await getStoredEvents(page)
    expect(events.filter((e: any) => e.type === 'sprout_watered')).toHaveLength(1)
  })

  test('per-sprout daily watering limit', async ({ page }) => {
    // Stable noon time
    await page.clock.install({ time: new Date(2026, 1, 15, 12, 0, 0) })
    await page.goto('/')

    // Seed: 2 sprouts — sprout s1 already watered today, sprout s2 not
    const plantTs = new Date(2026, 1, 8, 12, 0, 0).toISOString()
    const waterTs = new Date(2026, 1, 15, 9, 0, 0).toISOString()

    await page.evaluate(({ plantTs, waterTs }) => {
      const authKeys: [string, string][] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!
        if (key.startsWith('sb-')) authKeys.push([key, localStorage.getItem(key)!])
      }
      localStorage.clear()
      for (const [k, v] of authKeys) localStorage.setItem(k, v)
      localStorage.setItem('trunk-events-v1', JSON.stringify([
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l1', twigId: 'branch-0-twig-0', name: 'Saga 1' },
        { type: 'leaf_created', timestamp: plantTs, leafId: 'l2', twigId: 'branch-0-twig-0', name: 'Saga 2' },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's1', twigId: 'branch-0-twig-0', leafId: 'l1', title: 'Already Watered', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_planted', timestamp: plantTs, sproutId: 's2', twigId: 'branch-0-twig-0', leafId: 'l2', title: 'Needs Water', season: '1m', environment: 'fertile', soilCost: 3 },
        { type: 'sprout_watered', timestamp: waterTs, sproutId: 's1', content: 'morning water' },
      ]))
    }, { plantTs, waterTs })

    await page.reload()
    await page.waitForSelector('.canvas')

    // Navigate to twig view to see sprout cards
    await navigateToTwig(page)

    // Sprout 1 (already watered today): badge visible, no water button
    const card1 = page.locator('.sprout-active-card', { hasText: 'Already Watered' })
    await expect(card1.locator('.is-watered-badge')).toBeVisible()
    await expect(card1.locator('.sprout-water-btn')).toHaveCount(0)

    // Sprout 2 (not yet watered): water button visible, no badge
    const card2 = page.locator('.sprout-active-card', { hasText: 'Needs Water' })
    await expect(card2.locator('.sprout-water-btn')).toBeVisible()
    await expect(card2.locator('.is-watered-badge')).toHaveCount(0)

    // Water sprout 2 via the UI
    await card2.locator('.sprout-water-btn').click()
    await page.waitForSelector('.water-dialog:not(.hidden)')
    await page.fill('.water-dialog-journal', 'Afternoon entry')
    await page.click('.water-dialog-pour')
    await page.waitForTimeout(300)

    // Close the water dialog
    await page.click('.water-dialog-close')
    await page.waitForFunction(() =>
      document.querySelector('.water-dialog')?.classList.contains('hidden')
    )

    // After watering, sprout 2 should now show the watered badge too
    const card2After = page.locator('.sprout-active-card', { hasText: 'Needs Water' })
    await expect(card2After.locator('.is-watered-badge')).toBeVisible()
    await expect(card2After.locator('.sprout-water-btn')).toHaveCount(0)

    // DATA INTEGRITY: 2 water events total, one per sprout
    const events = await getStoredEvents(page)
    const waterEvents = events.filter((e: any) => e.type === 'sprout_watered')
    expect(waterEvents).toHaveLength(2)
    expect(waterEvents.map((e: any) => e.sproutId).sort()).toEqual(['s1', 's2'])
  })
})
