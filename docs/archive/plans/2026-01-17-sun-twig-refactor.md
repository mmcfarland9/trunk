# Sun Twig-Level Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the sun/shine system from sprout-level to twig-level, making sun a philosophical reflection on life facets rather than goal-specific planning.

**Architecture:**
- Sun entries move from `Sprout.sunEntries` to `NodeData.sunEntries` (twig-level)
- Shine dialog opens for a twig, not a sprout
- Weekly sun limit tracks per-twig shines
- Remove sprout-level shine buttons, change cultivated section button to "Graft"

**Tech Stack:** TypeScript, vanilla DOM

---

## Task 1: Add Twig-Level Sun Entries to NodeData

**Files:**
- Modify: `src/types.ts:76-86`

**Step 1: Add sunEntries to NodeData type**

```typescript
export type NodeData = {
  label: string
  note: string
  // Sprout and leaf data
  sprouts?: Sprout[]
  leaves?: Leaf[]
  // Twig-level sun entries (philosophical reflection on life facets)
  sunEntries?: SunEntry[]
  // Legacy fields (for migration, will be converted to sprouts)
  goalType?: GoalType
  goalValue?: number
  goalTitle?: string
}
```

**Step 2: Build to verify types compile**

Run: `npm run build`
Expected: Build succeeds (may have unused import warnings for now)

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add twig-level sunEntries to NodeData type"
```

---

## Task 2: Update State Functions for Twig-Level Sun

**Files:**
- Modify: `src/state.ts:550-580` (addSunEntry function)
- Modify: `src/state.ts:69-77` (capJournalEntries - remove sun capping from sprouts)

**Step 1: Update addSunEntry to work at twig level**

Replace the existing `addSunEntry` function:

```typescript
// Add a sun entry (shine) to a TWIG (not sprout)
// Sun is for philosophical reflection on life facets
export function addSunEntry(
  twigId: string,
  content: string,
  prompt?: string
): void {
  const data = nodeState[twigId]
  if (!data) {
    console.warn(`Cannot add sun entry: twig ${twigId} not found`)
    return
  }

  if (!data.sunEntries) {
    data.sunEntries = []
  }

  data.sunEntries.push({
    timestamp: getDebugDate().toISOString(),
    content,
    prompt,
  })

  // Cap sun entries to prevent unbounded growth (52 weeks = 1 year)
  if (data.sunEntries.length > MAX_SUN_ENTRIES_PER_SPROUT) {
    data.sunEntries = data.sunEntries.slice(-MAX_SUN_ENTRIES_PER_SPROUT)
  }

  saveState()
}
```

**Step 2: Remove sun capping from capJournalEntries (sprout-level)**

Update `capJournalEntries` to only cap water entries:

```typescript
function capJournalEntries(sprout: Sprout): void {
  if (sprout.waterEntries && sprout.waterEntries.length > MAX_WATER_ENTRIES_PER_SPROUT) {
    // Keep most recent entries, remove oldest
    sprout.waterEntries = sprout.waterEntries.slice(-MAX_WATER_ENTRIES_PER_SPROUT)
  }
  // Sun entries are now at twig level, not sprout level
}
```

**Step 3: Add helper to get twig sun entries**

```typescript
export function getTwigSunEntries(twigId: string): SunEntry[] {
  return nodeState[twigId]?.sunEntries || []
}

export function wasShoneThisWeek(twigId: string): boolean {
  const entries = getTwigSunEntries(twigId)
  if (!entries.length) return false

  const thisWeek = getWeekString(getDebugDate())
  return entries.some(entry => {
    const entryWeek = getWeekString(new Date(entry.timestamp))
    return entryWeek === thisWeek
  })
}
```

Note: Move `getWeekString` to be a module-level function if not already.

**Step 4: Build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/state.ts
git commit -m "feat: refactor addSunEntry to twig-level"
```

---

## Task 3: Update Shine Dialog for Twig-Level

**Files:**
- Modify: `src/features/shine-dialog.ts`

**Step 1: Update ShineDialogApi type and openShineDialog signature**

```typescript
export type ShineDialogApi = {
  openShineDialog: (twig: { twigId: string; twigLabel: string }) => void
  updateSunMeter: () => void
}
```

**Step 2: Rewrite openShineDialog for twig-level**

```typescript
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
```

**Step 3: Update state variable and saveSunEntry**

```typescript
let currentShiningTwig: { twigId: string } | null = null

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
```

**Step 4: Update imports**

```typescript
import { nodeState, getDebugDate, spendSun, canAffordSun, addSunEntry, getSunAvailable, getSunCapacity, wasShoneThisWeek } from '../state'
```

**Step 5: Remove old wasShoneThisWeek function (now imported from state)**

Delete the local `wasShoneThisWeek` function that takes `twigId, sproutId`.

**Step 6: Build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/features/shine-dialog.ts
git commit -m "refactor: shine-dialog now works at twig level"
```

---

## Task 4: Remove Sprout-Level Shine from Twig View

**Files:**
- Modify: `src/ui/twig-view.ts`

**Step 1: Remove wasShoneToday function**

Delete lines ~118-121 (the `wasShoneToday` function).

**Step 2: Remove shine button from cultivated sprout rendering**

In the `renderCultivatedSection` or equivalent, remove the shine button HTML:

Find and remove:
```typescript
${canShine ? `<button type="button" class="action-btn action-btn-passive action-btn-sun sprout-shine-btn" data-sprout-id="${s.id}" ${shone ? 'disabled' : ''}>${shone ? 'n/a' : 'Shine'}</button>` : ''}
```

**Step 3: Remove shine button click handler**

Find and remove the event listener for `.sprout-shine-btn`:
```typescript
// Remove this block:
container.querySelectorAll<HTMLButtonElement>('.sprout-shine-btn').forEach(btn => {
  // ...
})
```

**Step 4: Add twig-level shine button to twig header area**

Add a shine button near the twig title that opens the shine dialog for the twig:

```typescript
// In the twig header area, add:
const shineBtn = document.createElement('button')
shineBtn.className = 'action-btn action-btn-sun twig-shine-btn'
shineBtn.textContent = wasShoneThisWeek(twigId) ? 'Shone' : 'Shine'
shineBtn.disabled = wasShoneThisWeek(twigId)
shineBtn.addEventListener('click', () => {
  shineApi.openShineDialog({ twigId, twigLabel })
})
```

**Step 5: Build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/ui/twig-view.ts
git commit -m "refactor: move shine button to twig level, remove from sprouts"
```

---

## Task 5: Remove Sprout-Level Shine from Leaf View

**Files:**
- Modify: `src/ui/leaf-view.ts`

**Step 1: Remove sun entry rendering from sprout journal**

Find and remove the block that renders sun entries in the sprout's vertical journal:

```typescript
// Remove this block:
for (const sun of sprout.sunEntries || []) {
  // ...
}
```

**Step 2: Build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/ui/leaf-view.ts
git commit -m "refactor: remove sprout-level sun entries from leaf view"
```

---

## Task 6: Update Sidebar - Change Cultivated to Graft

**Files:**
- Modify: `src/ui/dom-builder.ts`
- Modify: `src/features/progress.ts`

**Step 1: Update sidebar toggle text**

In `dom-builder.ts`, find the cultivated sprouts toggle and change text:

```html
<button type="button" class="sprouts-toggle" data-section="cultivated">
  <span class="sprouts-toggle-label">Graft</span>
  <span class="sprouts-toggle-count">(0)</span>
</button>
```

**Step 2: Remove shine buttons from sidebar sprout items**

In `progress.ts`, find where shine buttons are added to cultivated sprouts in the sidebar and remove them.

Find and remove:
```typescript
// Shine action for cultivated (completed) sprouts
// ... shineBtn creation code ...
```

**Step 3: Build to verify**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/ui/dom-builder.ts src/features/progress.ts
git commit -m "refactor: change cultivated toggle to Graft, remove shine buttons"
```

---

## Task 7: Clean Up Unused Imports and Test

**Files:**
- Various files with unused imports

**Step 1: Build and fix any unused import errors**

Run: `npm run build`
Fix any TypeScript errors about unused imports (remove `SunEntry` from sprout-related imports, etc.)

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Manual test in browser**

- Open the app
- Navigate to a twig
- Verify shine button appears at twig level
- Click shine and verify dialog opens
- Submit a reflection and verify it saves
- Verify sun meter decreases
- Verify "Already reflected this week" message works

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: clean up unused imports after sun refactor"
```

---

## Summary

After completing all tasks:
- Sun is now twig-level (philosophical reflection on life facets)
- Shine dialog opens for twigs, not sprouts
- Sprouts no longer have sunEntries
- Cultivated sidebar section is now called "Graft"
- Shine buttons removed from sprout/leaf views
- Twig view has a shine button in the header
