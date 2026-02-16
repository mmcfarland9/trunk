# Beta Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the Trunk app for public beta across security, stability, and polish over three 2-week sprints.

**Architecture:** Progressive hardening approach—Sprint 1 secures user data, Sprint 2 adds tests and fixes edge cases, Sprint 3 polishes UX and performance. Each task is atomic and independently deployable.

**Tech Stack:** TypeScript, Vite, vanilla DOM, localStorage, CSS modules

---

## Sprint 1: Security & Data Safety (Weeks 1-2)

### Task 1.1: Escape HTML in User Content

**Files:**
- Create: `src/utils/escape-html.ts`
- Modify: `src/main.ts` (lines 312-333, 374-402, 489-513)
- Modify: `src/ui/twig-view.ts` (lines 280-307, 309-353)
- Modify: `src/ui/leaf-view.ts` (lines 140-180)

**Step 1: Create the escape utility**

```typescript
// src/utils/escape-html.ts
const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => escapeMap[char] || char)
}
```

**Step 2: Update sun log rendering in main.ts**

Find `populateSunLog()` function (~line 303). Replace template literal content interpolations:

```typescript
import { escapeHtml } from './utils/escape-html'

// In populateSunLog(), replace:
const context = entry.context.type === 'leaf'
  ? `${escapeHtml(entry.context.leafTitle)} · ${escapeHtml(locationLabel)}`
  : escapeHtml(locationLabel)
// ...
<p class="sun-log-entry-content">${escapeHtml(entry.content)}</p>
```

**Step 3: Update soil bag rendering in main.ts**

Find `populateSoilBag()` function. Escape the reason and context:

```typescript
// In populateSoilBag(), replace:
<span class="soil-bag-entry-reason">${escapeHtml(entry.reason)}</span>
${contextHtml ? `<span class="soil-bag-entry-context">${escapeHtml(entry.context)}</span>` : ''}
```

**Step 4: Update water can log rendering in main.ts**

Find `populateWaterCan()` function. Escape sprout title, twig label, and content:

```typescript
// In the template literal:
<span class="water-can-log-entry-context">${escapeHtml(entry.sproutTitle)} · ${escapeHtml(entry.twigLabel)}</span>
// ...
<p class="water-can-log-entry-content">${escapeHtml(entry.content)}</p>
```

**Step 5: Update twig-view card rendering**

In `renderHistoryCard()` and `renderActiveCard()`:

```typescript
import { escapeHtml } from '../utils/escape-html'

// In renderHistoryCard and renderActiveCard:
<p class="sprout-card-title">${escapeHtml(s.title)}</p>
// For bloom items:
${s.bloomWither ? `<span class="bloom-item">🥀 <em>${escapeHtml(s.bloomWither)}</em></span>` : ''}
${s.bloomBudding ? `<span class="bloom-item">🌱 <em>${escapeHtml(s.bloomBudding)}</em></span>` : ''}
${s.bloomFlourish ? `<span class="bloom-item">🌲 <em>${escapeHtml(s.bloomFlourish)}</em></span>` : ''}
// For reflection:
${s.reflection ? `<p class="sprout-card-reflection">${escapeHtml(s.reflection)}</p>` : ''}
```

**Step 6: Update leaf-view rendering**

Apply same escaping pattern to leaf-view.ts sprout rendering.

**Step 7: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 8: Manual test**

1. Create a sprout with title: `<script>alert('xss')</script>`
2. Water it with reflection: `<img src=x onerror="alert('xss')">`
3. Verify text displays literally, no script execution

**Step 9: Commit**

```bash
git add src/utils/escape-html.ts src/main.ts src/ui/twig-view.ts src/ui/leaf-view.ts
git commit -m "fix: escape HTML in user-generated content to prevent XSS"
```

---

### Task 1.2: Handle localStorage Quota

**Files:**
- Modify: `src/state/index.ts` (saveState function)
- Modify: `src/features/status.ts` (add persistent error type)

**Step 1: Create safe storage wrapper**

Add to `src/state/index.ts` before `saveState`:

```typescript
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded')
      return false
    }
    throw e
  }
}
```

**Step 2: Update saveState to use wrapper**

```typescript
export function saveState(callback?: () => void): void {
  const data = JSON.stringify({
    version: CURRENT_VERSION,
    nodeState,
    sunLog,
    soilLog,
  })

  if (!safeSetItem(STORAGE_KEY, data)) {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('trunk:storage-error', {
      detail: { type: 'quota', message: 'Storage full. Please export your data.' }
    }))
    return
  }

  callback?.()
}
```

**Step 3: Update saveResources similarly**

```typescript
export function saveResources(): void {
  const data = JSON.stringify(resourceState)
  if (!safeSetItem(RESOURCES_KEY, data)) {
    window.dispatchEvent(new CustomEvent('trunk:storage-error', {
      detail: { type: 'quota', message: 'Storage full. Please export your data.' }
    }))
  }
}
```

**Step 4: Listen for storage errors in main.ts**

Add after status initialization:

```typescript
// Handle storage errors
window.addEventListener('trunk:storage-error', ((e: CustomEvent) => {
  setStatus(ctx.elements, e.detail.message, 'error')
}) as EventListener)
```

**Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/state/index.ts src/main.ts
git commit -m "fix: handle localStorage quota exceeded gracefully"
```

---

### Task 1.3: Validate Import Structure

**Files:**
- Modify: `src/features/import-export.ts`

**Step 1: Add validation types**

```typescript
type ImportValidation = {
  valid: boolean
  warnings: string[]
  droppedNodes: string[]
  version: number
}

function validateImport(data: unknown, nodeLookup: Map<string, HTMLButtonElement>): ImportValidation {
  const warnings: string[] = []
  const droppedNodes: string[] = []

  if (typeof data !== 'object' || data === null) {
    return { valid: false, warnings: ['Invalid data format'], droppedNodes: [], version: 0 }
  }

  const obj = data as Record<string, unknown>
  const version = typeof obj.version === 'number' ? obj.version : 0

  if (version === 0) {
    warnings.push('No version found, assuming legacy format')
  }

  if (obj.nodeState && typeof obj.nodeState === 'object') {
    for (const key of Object.keys(obj.nodeState as object)) {
      if (!nodeLookup.has(key) && key !== 'trunk') {
        droppedNodes.push(key)
      }
    }
  }

  if (droppedNodes.length > 0) {
    warnings.push(`${droppedNodes.length} node(s) will be skipped (unknown IDs)`)
  }

  return { valid: true, warnings, droppedNodes, version }
}
```

**Step 2: Update handleImport to validate first**

```typescript
export async function handleImport(ctx: AppContext, callbacks: ImportExportCallbacks): Promise<void> {
  const input = ctx.elements.importInput
  const file = input.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)

    const validation = validateImport(parsed, ctx.nodeLookup)

    if (!validation.valid) {
      setStatus(ctx.elements, validation.warnings[0], 'error')
      input.value = ''
      return
    }

    if (validation.warnings.length > 0) {
      const proceed = confirm(
        `Import warnings:\n\n${validation.warnings.join('\n')}\n\nContinue with import?`
      )
      if (!proceed) {
        input.value = ''
        return
      }
    }

    // ... rest of import logic
  } catch (e) {
    setStatus(ctx.elements, 'Failed to parse import file', 'error')
  }

  input.value = ''
}
```

**Step 3: Verify build passes**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/features/import-export.ts
git commit -m "fix: validate import structure and warn about dropped data"
```

---

### Task 1.4: Add Import Version Migration

**Files:**
- Modify: `src/features/import-export.ts`
- Reference: `src/state/index.ts` (migration logic)

**Step 1: Extract migration functions**

In `src/state/index.ts`, export the migration functions:

```typescript
export function migrateV1ToV2(data: Record<string, NodeData>): void {
  // existing migration logic
}

export function migrateV2ToV3(data: Record<string, NodeData>): void {
  // existing migration logic
}
```

**Step 2: Apply migrations during import**

In `import-export.ts`:

```typescript
import { migrateV1ToV2, migrateV2ToV3 } from '../state'

// After validation, before applying:
if (validation.version < 2 && parsed.nodeState) {
  migrateV1ToV2(parsed.nodeState)
}
if (validation.version < 3 && parsed.nodeState) {
  migrateV2ToV3(parsed.nodeState)
}
```

**Step 3: Commit**

```bash
git add src/state/index.ts src/features/import-export.ts
git commit -m "fix: apply migrations to imported data"
```

---

### Task 1.5: Fix Unsafe Non-Null Assertions

**Files:**
- Modify: `src/ui/dom-builder.ts`
- Modify: Any file with `!` assertions on querySelector results

**Step 1: Find all unsafe assertions**

Run: `grep -n "querySelector.*\!" src/**/*.ts`

**Step 2: Replace with proper checks**

Pattern to follow:

```typescript
// Before:
const element = container.querySelector<HTMLInputElement>('.my-input')!

// After:
const element = container.querySelector<HTMLInputElement>('.my-input')
if (!element) throw new Error('Required element .my-input not found')
```

**Step 3: For dom-builder.ts, use helper function**

```typescript
function requireElement<T extends Element>(
  parent: Element | Document,
  selector: string
): T {
  const el = parent.querySelector<T>(selector)
  if (!el) throw new Error(`Required element ${selector} not found`)
  return el
}

// Usage:
const soilValue = requireElement<HTMLSpanElement>(container, '.soil-meter-value')
```

**Step 4: Verify build passes**

Run: `npm run build`

**Step 5: Commit**

```bash
git add -A
git commit -m "fix: replace unsafe non-null assertions with proper checks"
```

---

### Task 1.6: Add localStorage Save Error Recovery

**Files:**
- Modify: `src/state/index.ts`

**Step 1: Add retry queue**

```typescript
let pendingSave = false
let saveRetryTimeout: number | null = null

function scheduleSaveRetry(): void {
  if (saveRetryTimeout) return
  saveRetryTimeout = window.setTimeout(() => {
    saveRetryTimeout = null
    if (pendingSave) {
      pendingSave = false
      saveState()
    }
  }, 5000)
}
```

**Step 2: Update safeSetItem to queue retry**

```typescript
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      pendingSave = true
      scheduleSaveRetry()
      window.dispatchEvent(new CustomEvent('trunk:storage-error', {
        detail: { type: 'quota', message: 'Storage full. Please export your data.' }
      }))
      return false
    }
    throw e
  }
}
```

**Step 3: Commit**

```bash
git add src/state/index.ts
git commit -m "fix: retry failed saves and notify user"
```

---

### Task 1.7: Validate Sprout Form on Submit

**Files:**
- Modify: `src/ui/twig-view.ts`

**Step 1: Add validation on plant button click**

Find the `setBtn.addEventListener('click'` handler (~line 779):

```typescript
setBtn.addEventListener('click', () => {
  if (!selectedSeason || !selectedEnvironment) return

  const title = sproutTitleInput.value.trim()
  if (!title) {
    sproutTitleInput.focus()
    return
  }

  // Validate leaf selection
  const leafChoice = leafSelect.value
  if (!leafChoice) {
    leafSelect.focus()
    return
  }

  if (leafChoice === '__new__' && !newLeafNameInput.value.trim()) {
    newLeafNameInput.focus()
    return
  }

  // ... rest of plant logic
})
```

**Step 2: Commit**

```bash
git add src/ui/twig-view.ts
git commit -m "fix: validate sprout form fields on submit"
```

---

### Task 1.8: Debounce Harvest/Plant Buttons

**Files:**
- Create: `src/utils/debounce.ts`
- Modify: `src/ui/twig-view.ts`
- Modify: `src/features/harvest-dialog.ts`

**Step 1: Create debounce utility**

```typescript
// src/utils/debounce.ts
export function debounceClick(fn: () => void, delay = 300): () => void {
  let blocked = false
  return () => {
    if (blocked) return
    blocked = true
    fn()
    setTimeout(() => { blocked = false }, delay)
  }
}
```

**Step 2: Apply to plant button in twig-view.ts**

```typescript
import { debounceClick } from '../utils/debounce'

// Wrap the click handler:
setBtn.addEventListener('click', debounceClick(() => {
  // existing plant logic
}))
```

**Step 3: Apply to harvest save button**

In `harvest-dialog.ts`:

```typescript
import { debounceClick } from '../utils/debounce'

ctx.elements.harvestDialogSave.addEventListener('click', debounceClick(saveHarvest))
```

**Step 4: Commit**

```bash
git add src/utils/debounce.ts src/ui/twig-view.ts src/features/harvest-dialog.ts
git commit -m "fix: debounce plant and harvest buttons to prevent double-click"
```

---

## Sprint 2: Stability & Testing (Weeks 3-4)

### Task 2.1: Add Functional Tests for Core Flows

**Files:**
- Create: `src/__tests__/core-flows.test.ts`
- Modify: `package.json` (add vitest if not present)

**Step 1: Set up vitest**

```bash
npm install -D vitest @vitest/ui jsdom
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 2: Create test file with basic setup**

```typescript
// src/__tests__/core-flows.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  nodeState,
  calculateSoilCost,
  spendSoil,
  getSoilAvailable,
  canAffordSoil,
  generateSproutId,
} from '../state'

describe('Soil Economy', () => {
  beforeEach(() => {
    // Reset state before each test
    localStorage.clear()
  })

  it('calculates soil cost correctly for 2w fertile', () => {
    const cost = calculateSoilCost('2w', 'fertile')
    expect(cost).toBe(2)
  })

  it('calculates soil cost correctly for 1y barren', () => {
    const cost = calculateSoilCost('1y', 'barren')
    expect(cost).toBe(24)
  })

  it('spends soil and reduces available', () => {
    const initial = getSoilAvailable()
    spendSoil(2, 'Test', 'test sprout')
    expect(getSoilAvailable()).toBe(initial - 2)
  })

  it('prevents spending more than available', () => {
    const available = getSoilAvailable()
    expect(canAffordSoil(available + 1)).toBe(false)
  })
})

describe('Sprout Lifecycle', () => {
  it('generates unique sprout IDs', () => {
    const id1 = generateSproutId()
    const id2 = generateSproutId()
    expect(id1).not.toBe(id2)
  })
})
```

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add package.json src/__tests__/core-flows.test.ts
git commit -m "test: add functional tests for soil economy and sprout lifecycle"
```

---

### Task 2.2: Add Import/Export Round-Trip Test

**Files:**
- Modify: `src/__tests__/core-flows.test.ts`

**Step 1: Add round-trip test**

```typescript
describe('Import/Export', () => {
  it('round-trips data correctly', () => {
    // Set up test data
    nodeState['branch-0-twig-0'] = {
      label: 'Test Twig',
      note: 'Test note',
      sprouts: [{
        id: 'test-sprout-1',
        title: 'Test Sprout',
        season: '2w',
        environment: 'fertile',
        state: 'active',
        soilCost: 2,
        createdAt: new Date().toISOString(),
      }],
    }

    // Export
    const exported = JSON.stringify({
      version: 3,
      nodeState,
      sunLog: [],
      soilLog: [],
    })

    // Clear
    delete nodeState['branch-0-twig-0']

    // Import
    const parsed = JSON.parse(exported)
    Object.assign(nodeState, parsed.nodeState)

    // Verify
    expect(nodeState['branch-0-twig-0'].sprouts?.[0].title).toBe('Test Sprout')
  })
})
```

**Step 2: Run tests**

Run: `npm test`

**Step 3: Commit**

```bash
git add src/__tests__/core-flows.test.ts
git commit -m "test: add import/export round-trip test"
```

---

### Task 2.3: Test Date-Based Reset Logic

**Files:**
- Modify: `src/__tests__/core-flows.test.ts`

**Step 1: Add date reset tests**

```typescript
import { vi } from 'vitest'
import { getWaterAvailable, spendWater, checkAndResetResources } from '../state'

describe('Resource Resets', () => {
  it('resets water at midnight', () => {
    // Use all water
    while (getWaterAvailable() > 0) {
      spendWater()
    }
    expect(getWaterAvailable()).toBe(0)

    // Mock time to next day
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000))

    checkAndResetResources()
    expect(getWaterAvailable()).toBe(3)

    vi.useRealTimers()
  })
})
```

**Step 2: Run tests**

Run: `npm test`

**Step 3: Commit**

```bash
git add src/__tests__/core-flows.test.ts
git commit -m "test: add date-based resource reset tests"
```

---

### Task 2.4: Fix O(n²) Water Count Performance

**Files:**
- Modify: `src/state/index.ts`

**Step 1: Add water count cache**

```typescript
let waterUsedTodayCache: number | null = null
let waterCacheDate: string | null = null

function getWaterCacheKey(): string {
  return new Date(getDebugNow()).toDateString()
}

export function invalidateWaterCache(): void {
  waterUsedTodayCache = null
}

export function getWaterUsedToday(): number {
  const cacheKey = getWaterCacheKey()

  // Invalidate if day changed
  if (waterCacheDate !== cacheKey) {
    waterUsedTodayCache = null
    waterCacheDate = cacheKey
  }

  if (waterUsedTodayCache !== null) {
    return waterUsedTodayCache
  }

  // Calculate and cache
  waterUsedTodayCache = calculateWaterUsedToday()
  return waterUsedTodayCache
}
```

**Step 2: Invalidate cache when water is used**

```typescript
export function spendWater(): boolean {
  if (!canAffordWater()) return false
  // ... existing logic
  invalidateWaterCache()
  return true
}
```

**Step 3: Commit**

```bash
git add src/state/index.ts
git commit -m "perf: cache water count to avoid O(n) recalculation"
```

---

### Task 2.5: Extract Duplicate Emoji Maps

**Files:**
- Create: `src/constants.ts` (or modify existing)
- Modify: `src/ui/twig-view.ts`
- Modify: `src/features/harvest-dialog.ts`
- Modify: `src/ui/leaf-view.ts`

**Step 1: Add to constants.ts**

```typescript
export const RESULT_EMOJIS: Record<number, string> = {
  1: '🥀', // withered
  2: '🌱', // sprout
  3: '🌿', // sapling
  4: '🌳', // tree
  5: '🌲', // strong oak
}

export function getResultEmoji(result: number): string {
  return RESULT_EMOJIS[result] || '🌱'
}
```

**Step 2: Remove duplicate functions and import**

In each file, remove local `getResultEmoji` and import from constants:

```typescript
import { getResultEmoji } from '../constants'
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/constants.ts src/ui/twig-view.ts src/features/harvest-dialog.ts src/ui/leaf-view.ts
git commit -m "refactor: extract duplicate emoji maps to constants"
```

---

### Task 2.6: Fix Sprout "Ready" Edge Case

**Files:**
- Modify: `src/ui/twig-view.ts`

**Step 1: Fix isReady function**

```typescript
function isReady(sprout: Sprout): boolean {
  // Must have an endDate to be ready
  if (!sprout.endDate) return false
  return new Date(sprout.endDate).getTime() <= getDebugNow()
}
```

**Step 2: Commit**

```bash
git add src/ui/twig-view.ts
git commit -m "fix: require endDate for sprout to be ready"
```

---

### Task 2.7: Fix Leaf Name Derivation

**Files:**
- Modify: `src/state/index.ts`

**Step 1: Sort by createdAt before picking name**

In `migrateV1ToV2`:

```typescript
// Sort by createdAt to get actual most recent
const sorted = leafSprouts.sort((a, b) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
)
const mostRecent = sorted[0]
leaf.name = mostRecent?.title || 'Unnamed Saga'
```

**Step 2: Commit**

```bash
git add src/state/index.ts
git commit -m "fix: sort sprouts by date when deriving leaf name"
```

---

### Task 2.8: Add Debounce to Editor Reposition

**Files:**
- Modify: `src/ui/layout.ts`

**Step 1: Add debounced reposition**

```typescript
let repositionTimeout: number | null = null

export function positionNodes(ctx: AppContext): void {
  // ... existing positioning logic

  // Debounce editor reposition
  if (repositionTimeout) {
    cancelAnimationFrame(repositionTimeout)
  }
  repositionTimeout = requestAnimationFrame(() => {
    if (activeNode) ctx.editor.reposition(activeNode)
    repositionTimeout = null
  })
}
```

**Step 2: Commit**

```bash
git add src/ui/layout.ts
git commit -m "perf: debounce editor reposition during layout"
```

---

### Task 2.9: Fix Double Resize Observer Trigger

**Files:**
- Modify: `src/main.ts`

**Step 1: Remove redundant resize listener**

Find and remove:
```typescript
window.addEventListener('resize', () => positionNodes(ctx))
```

The ResizeObserver already handles this.

**Step 2: Commit**

```bash
git add src/main.ts
git commit -m "fix: remove redundant resize listener"
```

---

### Task 2.10: Clear Pending Timeouts on Hover

**Files:**
- Modify: `src/features/hover-branch.ts`

**Step 1: Track and clear timeouts**

```typescript
const pendingTimeouts: Set<number> = new Set()

function safeTimeout(fn: () => void, delay: number): number {
  const id = window.setTimeout(() => {
    pendingTimeouts.delete(id)
    fn()
  }, delay)
  pendingTimeouts.add(id)
  return id
}

export function clearAllHoverTimeouts(): void {
  pendingTimeouts.forEach(id => clearTimeout(id))
  pendingTimeouts.clear()
}
```

**Step 2: Use safeTimeout in hover handlers**

Replace `setTimeout` calls with `safeTimeout`.

**Step 3: Call clearAllHoverTimeouts on view change**

In navigation.ts, when entering/leaving branch view:
```typescript
clearAllHoverTimeouts()
```

**Step 4: Commit**

```bash
git add src/features/hover-branch.ts src/features/navigation.ts
git commit -m "fix: clear pending hover timeouts on navigation"
```

---

## Sprint 3: Polish & Performance (Weeks 5-6)

### Task 3.1: Add Keyboard Shortcut Hints

**Files:**
- Modify: `src/ui/dom-builder.ts`
- Modify: `src/styles/canvas.css`

**Step 1: Add hint element to branch nodes**

In dom-builder.ts, when creating branch buttons:

```typescript
const hint = document.createElement('span')
hint.className = 'branch-key-hint'
hint.textContent = String(i + 1)
branchBtn.append(hint)
```

**Step 2: Style the hint**

```css
.branch-key-hint {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 16px;
  height: 16px;
  font-size: 10px;
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 200ms;
}

.branch:hover .branch-key-hint,
.branch:focus .branch-key-hint {
  opacity: 0.7;
}
```

**Step 3: Commit**

```bash
git add src/ui/dom-builder.ts src/styles/canvas.css
git commit -m "feat: show keyboard shortcut hints on branch hover"
```

---

### Task 3.2: Label Harvest Result Slider

**Files:**
- Modify: `src/ui/dom-builder.ts`
- Modify: `src/styles/dialogs.css`

**Step 1: Add labels to harvest dialog HTML**

```html
<div class="harvest-dialog-slider-row">
  <span class="harvest-slider-label">withered</span>
  <input type="range" min="1" max="5" value="3" class="harvest-dialog-slider" />
  <span class="harvest-slider-label">flourished</span>
</div>
```

**Step 2: Style labels**

```css
.harvest-slider-label {
  font-size: var(--text-xs);
  color: var(--ink-light);
  text-transform: lowercase;
}
```

**Step 3: Commit**

```bash
git add src/ui/dom-builder.ts src/styles/dialogs.css
git commit -m "feat: add labels to harvest result slider"
```

---

### Task 3.3: Add Loading State for Import

**Files:**
- Modify: `src/features/import-export.ts`
- Modify: `src/styles/dialogs.css`

**Step 1: Show loading class during import**

```typescript
export async function handleImport(ctx: AppContext, callbacks: ImportExportCallbacks): Promise<void> {
  const input = ctx.elements.importInput
  const file = input.files?.[0]
  if (!file) return

  document.body.classList.add('is-importing')

  try {
    // ... import logic
  } finally {
    document.body.classList.remove('is-importing')
    input.value = ''
  }
}
```

**Step 2: Add loading cursor style**

```css
body.is-importing {
  cursor: wait;
}

body.is-importing * {
  pointer-events: none;
}
```

**Step 3: Commit**

```bash
git add src/features/import-export.ts src/styles/dialogs.css
git commit -m "feat: show loading state during import"
```

---

### Task 3.4: Improve Error Messages

**Files:**
- Create: `src/utils/errors.ts`
- Modify: Various files that show errors

**Step 1: Create error message map**

```typescript
// src/utils/errors.ts
export const ERROR_MESSAGES = {
  QUOTA_EXCEEDED: 'Storage is full. Please export your data to free up space.',
  PARSE_ERROR: 'Could not read the file. Please check it is a valid Trunk export.',
  NETWORK_ERROR: 'Could not connect. Please check your internet connection.',
  UNKNOWN: 'Something went wrong. Please try again.',
} as const

export function getErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return ERROR_MESSAGES.QUOTA_EXCEEDED
  }
  if (error instanceof SyntaxError) {
    return ERROR_MESSAGES.PARSE_ERROR
  }
  return ERROR_MESSAGES.UNKNOWN
}
```

**Step 2: Use in import-export.ts**

```typescript
import { getErrorMessage } from '../utils/errors'

catch (e) {
  setStatus(ctx.elements, getErrorMessage(e), 'error')
}
```

**Step 3: Commit**

```bash
git add src/utils/errors.ts src/features/import-export.ts
git commit -m "feat: improve error messages for common failures"
```

---

### Task 3.5: Add Aria Labels to Dialogs

**Files:**
- Modify: `src/ui/dom-builder.ts`

**Step 1: Add role and aria-label to dialogs**

```typescript
// For each dialog:
waterDialog.setAttribute('role', 'dialog')
waterDialog.setAttribute('aria-label', 'Water sprout')
waterDialog.setAttribute('aria-modal', 'true')
```

**Step 2: Add aria-hidden to hidden dialogs**

When showing/hiding dialogs, toggle aria-hidden:

```typescript
function showDialog(dialog: HTMLElement): void {
  dialog.classList.remove('hidden')
  dialog.setAttribute('aria-hidden', 'false')
}

function hideDialog(dialog: HTMLElement): void {
  dialog.classList.add('hidden')
  dialog.setAttribute('aria-hidden', 'true')
}
```

**Step 3: Commit**

```bash
git add src/ui/dom-builder.ts
git commit -m "a11y: add ARIA attributes to dialogs"
```

---

### Task 3.6: Add Accessible Status Text

**Files:**
- Modify: `src/ui/dom-builder.ts`
- Modify: `src/styles/utilities.css`

**Step 1: Add visually hidden class**

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

**Step 2: Add screen reader text to status indicators**

```typescript
// When showing success:
statusEl.innerHTML = `
  <span class="status-icon" aria-hidden="true">✓</span>
  <span class="visually-hidden">Success:</span>
  ${message}
`
```

**Step 3: Commit**

```bash
git add src/ui/dom-builder.ts src/styles/utilities.css
git commit -m "a11y: add screen reader text for status indicators"
```

---

### Task 3.7: Test and Fix Mobile Layout

**Files:**
- Modify: `src/styles/responsive.css`

**Step 1: Add mobile breakpoint**

```css
@media (max-width: 480px) {
  .canvas {
    transform: scale(0.6);
    transform-origin: top center;
  }

  .panel {
    width: 100%;
    max-height: 40vh;
  }

  .twig-view {
    padding: var(--space-2);
  }

  .sprout-column {
    min-width: 100%;
  }

  .twig-view-body {
    flex-direction: column;
  }
}
```

**Step 2: Test on mobile viewport**

Use browser dev tools to test at 375px and 414px widths.

**Step 3: Commit**

```bash
git add src/styles/responsive.css
git commit -m "fix: improve mobile layout at small viewports"
```

---

### Task 3.8: Cache getAllWaterEntries

**Files:**
- Modify: `src/main.ts`

**Step 1: Add memoization**

```typescript
let waterEntriesCache: WaterLogEntry[] | null = null
let waterEntriesCacheTime = 0
const CACHE_TTL = 5000 // 5 seconds

function getAllWaterEntries(): WaterLogEntry[] {
  const now = Date.now()
  if (waterEntriesCache && now - waterEntriesCacheTime < CACHE_TTL) {
    return waterEntriesCache
  }

  // ... existing logic

  waterEntriesCache = entries
  waterEntriesCacheTime = now
  return entries
}

// Invalidate on water dialog close
function invalidateWaterEntriesCache(): void {
  waterEntriesCache = null
}
```

**Step 2: Commit**

```bash
git add src/main.ts
git commit -m "perf: cache water entries with 5s TTL"
```

---

### Task 3.9: Extract Log Renderers from main.ts

**Files:**
- Create: `src/features/sun-log.ts`
- Create: `src/features/soil-log.ts`
- Create: `src/features/water-log.ts`
- Modify: `src/main.ts`

**Step 1: Extract sun log rendering**

```typescript
// src/features/sun-log.ts
import type { AppContext } from '../types'
import { sunLog, getPresetLabel, nodeState } from '../state'

export function populateSunLog(ctx: AppContext): void {
  // Move populateSunLog function here
}

export function formatSunLogTimestamp(dateStr: string): string {
  // Move helper here
}
```

**Step 2: Extract soil log rendering**

```typescript
// src/features/soil-log.ts
// Similar extraction
```

**Step 3: Extract water log rendering**

```typescript
// src/features/water-log.ts
// Similar extraction
```

**Step 4: Update main.ts to import and use**

```typescript
import { populateSunLog } from './features/sun-log'
import { populateSoilBag } from './features/soil-log'
import { populateWaterCan } from './features/water-log'
```

**Step 5: Commit**

```bash
git add src/features/sun-log.ts src/features/soil-log.ts src/features/water-log.ts src/main.ts
git commit -m "refactor: extract log renderers from main.ts"
```

---

### Task 3.10: Add Export Success Confirmation

**Files:**
- Modify: `src/features/import-export.ts`

**Step 1: Show confirmation message**

```typescript
export function handleExport(ctx: AppContext): void {
  // ... existing export logic

  link.click()

  // Show confirmation
  setStatus(ctx.elements, 'Exported to Downloads folder', 'info')

  // Update last export timestamp
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString())
}
```

**Step 2: Commit**

```bash
git add src/features/import-export.ts
git commit -m "feat: show confirmation after successful export"
```

---

### Task 3.11: Document Keyboard Navigation

**Files:**
- Modify: `src/ui/dom-builder.ts`

**Step 1: Add keyboard shortcuts to settings dialog**

```html
<div class="settings-section">
  <h3>Keyboard Shortcuts</h3>
  <ul class="shortcuts-list">
    <li><kbd>1</kbd>-<kbd>8</kbd> Jump to branch (in overview) or twig (in branch view)</li>
    <li><kbd>←</kbd> <kbd>→</kbd> Navigate between branches</li>
    <li><kbd>Esc</kbd> Close dialog or zoom out</li>
  </ul>
</div>
```

**Step 2: Style shortcuts**

```css
.shortcuts-list {
  font-size: var(--text-sm);
  padding-left: var(--space-4);
}

.shortcuts-list kbd {
  background: var(--paper-dark);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 2px 6px;
  font-family: var(--font-mono);
}
```

**Step 3: Commit**

```bash
git add src/ui/dom-builder.ts src/styles/dialogs.css
git commit -m "docs: add keyboard shortcuts to settings dialog"
```

---

## Final Checklist

After completing all sprints:

- [ ] Run full test suite: `npm test`
- [ ] Run production build: `npm run build`
- [ ] Manual testing on desktop Chrome, Firefox, Safari
- [ ] Manual testing on mobile viewport
- [ ] Export/import round-trip with real data
- [ ] Test with localStorage near capacity
- [ ] Review all console warnings
- [ ] Update version number for beta release
